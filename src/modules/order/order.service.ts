import { NOTIFICATION_ENTITY_TYPE, NOTIFICATION_TYPE } from "../notification/notification.constant";
import { notificationService } from "../notification/notification.service";
import { metaCapiService } from "../marketing/meta-capi.service";
import { randomBytes } from "crypto";
import httpStatus from "http-status";
import mongoose, { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { INVENTORY_MOVEMENT_TYPE } from "../inventory/inventory.constant";
import InventoryMovement from "../inventory/inventory.model";
import { notifyLowStockAdmins } from "../inventory/inventory.notification";
import { PRODUCT_STATUS } from "../product/product.constant";
import Product from "../product/product.model";
import {
  DELIVERY_ZONE,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,
  getAllowedOrderStatusTransitions,
  getAllowedPaymentStatusTransitions,
  isAllowedOrderStatusTransition,
  isAllowedPaymentStatusTransition,
} from "./order.constant";
import Order from "./order.model";
import { orderNotification } from "./order.notification";
import type {
  TDeliveryZone,
  TOrder,
  TOrderStatus,
  TPaymentStatus,
} from "./order.types";

type TCreateOrderPayload = {
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
  customer: {
    name: string;
    phone: string;
  };
  deliveryAddress: {
    addressLine: string;
    area: string;
    city: string;
    district: string;
    postalCode?: string;
  };
  deliveryZone: TDeliveryZone;
  customerNote?: string;
  conversionContext?: {
    eventId?: string;
    fbp?: string;
    fbc?: string;
    eventSourceUrl?: string;
    marketingConsent?: boolean;
  };
};

type TOrderQuery = {
  page?: string;
  limit?: string;
  status?: string;
  paymentStatus?: string;
  orderNumber?: string;
  search?: string;
};

const DELIVERY_FEES: Record<TDeliveryZone, number> = {
  [DELIVERY_ZONE.DHAKA]: 60,
  [DELIVERY_ZONE.OUTSIDE_DHAKA]: 120,
};

const createOrder = async (
  user: { id: string; email: string },
  payload: TCreateOrderPayload,
  requestContext?: { clientIp?: string; userAgent?: string },
) => {
  if (!user.id || !user.email) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Authenticated customer details are required",
    );
  }

  // Merge duplicate product ID + variant ID combinations before validating stock.
  const requestedItems = new Map<
    string,
    { productId: string; variantId?: string; quantity: number }
  >();

  for (const item of payload.items) {
    if (!Types.ObjectId.isValid(item.productId)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Invalid product ID",
      );
    }

    if (item.variantId && !Types.ObjectId.isValid(item.variantId)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Invalid variant ID",
      );
    }

    const key = `${item.productId.toLowerCase()}:${item.variantId ?? ""}`;
    const existing = requestedItems.get(key);
    const combinedQuantity = (existing?.quantity ?? 0) + item.quantity;

    if (combinedQuantity > 99) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Combined quantity for an item cannot exceed 99",
      );
    }

    requestedItems.set(key, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: combinedQuantity,
    });
  }

  const session = await mongoose.startSession();

  try {
    let createdOrderId: Types.ObjectId | undefined;

    // Collect low-stock alerts during the transaction.
    // Emails will only be sent after the transaction succeeds.
    const lowStockAlerts: {
      name: string;
      sku: string;
      stockQuantity: number;
      lowStockThreshold: number;
    }[] = [];

    await session.withTransaction(async () => {
      // MongoDB can retry a transaction callback.
      // Clear alerts so a retry cannot create duplicate emails.
      lowStockAlerts.length = 0;

      const uniqueProductIds = [
        ...new Set([...requestedItems.values()].map((i) => i.productId)),
      ].map((id) => new Types.ObjectId(id));

      const products = await Product.find({
        _id: { $in: uniqueProductIds },
        status: PRODUCT_STATUS.PUBLISHED,
      })
        .select(
          "_id name slug sku primaryImage price stockQuantity lowStockThreshold variants",
        )
        .session(session);

      if (products.length !== uniqueProductIds.length) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "One or more products are unavailable",
        );
      }

      const productMap = new Map(
        products.map((product) => [product._id.toString(), product]),
      );

      const items = [];

      for (const req of requestedItems.values()) {
        const product = productMap.get(req.productId);

        if (!product) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            "One or more products are unavailable",
          );
        }

        const hasVariants =
          Array.isArray(product.variants) && product.variants.length > 0;
        let targetVariant: (typeof product.variants)[0] | undefined;

        if (hasVariants) {
          if (req.variantId) {
            targetVariant = product.variants.find(
              (v) => v._id?.toString() === req.variantId,
            );
            if (!targetVariant) {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `Selected weight is no longer available for "${product.name}".`,
              );
            }
          } else if (product.variants.length === 1) {
            targetVariant = product.variants[0];
          } else {
            throw new AppError(
              httpStatus.BAD_REQUEST,
              `Please select a weight for "${product.name}".`,
            );
          }
        }

        let updatedProduct;
        let previousStock: number;
        let resultingStock: number;
        let unitPrice: number;
        let itemSku: string;
        let variantWeight = "";

        if (targetVariant) {
          previousStock = targetVariant.stockQuantity;
          variantWeight = targetVariant.weight || targetVariant.size || "";

          if (previousStock < req.quantity) {
            throw new AppError(
              httpStatus.CONFLICT,
              `Insufficient stock for "${product.name} (${variantWeight})". Available quantity: ${previousStock}`,
            );
          }

          updatedProduct = await Product.findOneAndUpdate(
            {
              _id: product._id,
              status: PRODUCT_STATUS.PUBLISHED,
              "variants._id": targetVariant._id,
              "variants.stockQuantity": { $gte: req.quantity },
            },
            {
              $inc: {
                "variants.$.stockQuantity": -req.quantity,
                stockQuantity: -req.quantity,
              },
            },
            {
              new: true,
              runValidators: true,
              session,
            },
          );

          if (!updatedProduct) {
            throw new AppError(
              httpStatus.CONFLICT,
              `Insufficient stock for "${product.name} (${variantWeight})". Please refresh your cart.`,
            );
          }

          const updatedVariant = updatedProduct.variants?.find(
            (v) => v._id?.toString() === targetVariant!._id?.toString(),
          );
          resultingStock = updatedVariant
            ? updatedVariant.stockQuantity
            : previousStock - req.quantity;
          unitPrice = targetVariant.price;
          itemSku = targetVariant.sku || product.sku;

          const threshold =
            targetVariant.lowStockThreshold ?? product.lowStockThreshold;
          const crossedLowStockThreshold =
            previousStock > threshold && resultingStock <= threshold;
          const crossedOutOfStockThreshold =
            previousStock > 0 && resultingStock <= 0;

          if (crossedLowStockThreshold || crossedOutOfStockThreshold) {
            lowStockAlerts.push({
              name: `${product.name} (${variantWeight})`,
              sku: itemSku,
              stockQuantity: resultingStock,
              lowStockThreshold: threshold,
            });
          }
        } else {
          // Legacy product without variants
          previousStock = product.stockQuantity;

          updatedProduct = await Product.findOneAndUpdate(
            {
              _id: product._id,
              status: PRODUCT_STATUS.PUBLISHED,
              stockQuantity: { $gte: req.quantity },
            },
            {
              $inc: { stockQuantity: -req.quantity },
            },
            {
              new: true,
              runValidators: true,
              session,
            },
          );

          if (!updatedProduct) {
            throw new AppError(
              httpStatus.CONFLICT,
              `Insufficient stock for "${product.name}". Please refresh your cart.`,
            );
          }

          resultingStock = updatedProduct.stockQuantity;
          unitPrice = product.price;
          itemSku = product.sku;

          const crossedLowStockThreshold =
            previousStock > product.lowStockThreshold &&
            resultingStock <= product.lowStockThreshold;
          const crossedOutOfStockThreshold =
            previousStock > 0 && resultingStock <= 0;

          if (crossedLowStockThreshold || crossedOutOfStockThreshold) {
            lowStockAlerts.push({
              name: product.name,
              sku: product.sku,
              stockQuantity: resultingStock,
              lowStockThreshold: product.lowStockThreshold,
            });
          }
        }

        const lineTotal = Number((unitPrice * req.quantity).toFixed(2));

        items.push({
          productId: product._id,
          variantId: targetVariant?._id,
          weight: variantWeight,
          size: variantWeight,
          name: product.name,
          slug: product.slug,
          sku: itemSku,
          primaryImage: product.primaryImage,
          unitPrice,
          quantity: req.quantity,
          lineTotal,
        });

        await InventoryMovement.create(
          [
            {
              productId: product._id,
              variantId: targetVariant?._id,
              variantWeight,
              variantSize: variantWeight,
              movementType: INVENTORY_MOVEMENT_TYPE.DECREASE,
              quantity: req.quantity,
              previousStock,
              resultingStock,
              reason: variantWeight
                ? `Customer order placed (${variantWeight})`
                : "Customer order placed",
              performedBy: user.id,
            },
          ],
          { session },
        );
      }

      const subtotal = Number(
        items
          .reduce((sum, item) => sum + item.lineTotal, 0)
          .toFixed(2),
      );

      const deliveryFee = DELIVERY_FEES[payload.deliveryZone];
      const totalAmount = Number((subtotal + deliveryFee).toFixed(2));

      const orderNumber = `ES-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;

      const [order] = await Order.create(
        [
          {
            orderNumber,
            userId: user.id,
            items,
            customer: {
              name: payload.customer.name,
              phone: payload.customer.phone,
              email: user.email,
            },
            deliveryAddress: payload.deliveryAddress,
            deliveryZone: payload.deliveryZone,
            deliveryFee,
            subtotal,
            totalAmount,
            currency: "BDT",
            paymentMethod: PAYMENT_METHOD.COD,
            paymentStatus: PAYMENT_STATUS.PENDING,
            status: ORDER_STATUS.PENDING,
            customerNote: payload.customerNote,
          },
        ],
        { session },
      );

      createdOrderId = order._id;
    });

    if (!createdOrderId) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Order could not be created",
      );
    }

    const order = await Order.findById(createdOrderId);

    if (!order) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Order was created but could not be retrieved",
      );
    }

    // Send low-stock alerts only after the order transaction commits.
    for (const product of lowStockAlerts) {
      try {
        await notifyLowStockAdmins(product);
      } catch (error) {
        // The order succeeded. Email failure must not undo the order.
        console.error(
          `Failed to send purchase-triggered low-stock alert for ${product.name}:`,
          error,
        );
      }
    }

    // Send the confirmation email after the order transaction commits.
    try {
      await orderNotification.notifyOrderPlaced(order);
    } catch (error) {
      // The order was already created successfully.
      // Email failure must not make the order request fail.
      console.error(
        `Failed to send order confirmation email for ${order.orderNumber}:`,
        error,
      );
    }

    // In-app notification to all administrators
    void notificationService
      .notifyAdmins({
        type: NOTIFICATION_TYPE.ORDER_CREATED,
        title: "New Order Placed",
        message: `Order ${order.orderNumber} placed by ${order.customer.name} (BDT ${order.totalAmount}).`,
        entityType: NOTIFICATION_ENTITY_TYPE.ORDER,
        entityId: order._id.toString(),
        actionUrl: "/dashboard/ecommerce/orders",
        metadata: {
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          customerName: order.customer.name,
          userId: order.userId,
        },
      })
      .catch((err) =>
        console.error("Failed to notify admins of order placed:", err),
      );

    // Dispatch server-side Purchase event to Meta CAPI only after transaction commit
    void metaCapiService
      .dispatchPurchaseEvent({
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          currency: order.currency,
          items: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productName: item.name,
          })),
          customer: {
            name: order.customer.name,
            phone: order.customer.phone,
            email: order.customer.email,
          },
          userId: order.userId,
        },
        context: {
          ...payload.conversionContext,
          clientIp: requestContext?.clientIp,
          userAgent: requestContext?.userAgent,
        },
      })
      .catch((err) =>
        console.error("Failed to dispatch CAPI Purchase event:", err),
      );

    return order;
  } finally {
    await session.endSession();
  }
};

const getOrders = async (query: TOrderQuery, userId?: string) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  // If userId is supplied, only return that customer's orders.
  if (userId) {
    filter.userId = userId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus;
  }

  if (query.orderNumber) {
    filter.orderNumber = query.orderNumber.trim();
  }

  if (query.search?.trim()) {
    const searchTerm = query.search
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const searchRegex = new RegExp(searchTerm, "i");

    const searchConditions: Record<string, unknown>[] = [
      { orderNumber: searchRegex },
      { "customer.name": searchRegex },
      { "customer.email": searchRegex },
    ];

    // Also allow searching by MongoDB order ID.
    if (Types.ObjectId.isValid(query.search.trim())) {
      searchConditions.push({
        _id: new Types.ObjectId(query.search.trim()),
      });
    }

    filter.$or = searchConditions;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    data: orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getMyOrders = async (userId: string, query: TOrderQuery) => {
  if (!userId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Authentication required",
    );
  }

  return getOrders(query, userId);
};

const getAllOrders = async (query: TOrderQuery) => {
  return getOrders(query);
};

const getMyOrderById = async (userId: string, orderId: string) => {
  const order = await Order.findOne({
    _id: orderId,
    userId,
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

const getOrderById = async (orderId: string) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

const cancelOrder = async (
  orderId: string,
  actor: { id: string; role: "user" | "admin" },
  reason?: string,
) => {
  const session = await mongoose.startSession();

  try {
    let cancelledOrder: TOrder | null = null;

    await session.withTransaction(async () => {
      const allowedStatuses: TOrderStatus[] =
        actor.role === "admin"
          ? [
              ORDER_STATUS.PENDING,
              ORDER_STATUS.CONFIRMED,
              ORDER_STATUS.PROCESSING,
            ]
          : [ORDER_STATUS.PENDING];

      const orderFilter: Record<string, unknown> = {
        _id: orderId,
        status: { $in: allowedStatuses },
      };

      if (actor.role === "user") {
        orderFilter.userId = actor.id;
      }

      // Claim the cancellation atomically. A concurrent cancellation
      // cannot also claim this order and restore its stock.
      const order = await Order.findOneAndUpdate(
        orderFilter,
        {
          $set: {
            status: ORDER_STATUS.CANCELLED,
            ...(reason ? { cancellationReason: reason } : {}),
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!order) {
        const existingOrder =
          await Order.findById(orderId).session(session);

        if (!existingOrder) {
          throw new AppError(httpStatus.NOT_FOUND, "Order not found");
        }

        if (
          actor.role === "user" &&
          existingOrder.userId !== actor.id
        ) {
          throw new AppError(httpStatus.NOT_FOUND, "Order not found");
        }

        if (existingOrder.status === ORDER_STATUS.CANCELLED) {
          throw new AppError(
            httpStatus.CONFLICT,
            "Order has already been cancelled",
          );
        }

        throw new AppError(
          httpStatus.CONFLICT,
          actor.role === "admin"
            ? "This order can no longer be cancelled"
            : "You can only cancel orders that are pending",
        );
      }

      for (const item of order.items) {
        const product = await Product.findById(
          item.productId,
        ).session(session);

        if (!product) {
          throw new AppError(
            httpStatus.CONFLICT,
            `Cannot restore stock: product "${item.name}" no longer exists`,
          );
        }

        let updatedProduct;
        let previousStock: number;
        let resultingStock: number;

        if (item.variantId) {
          const existingVariant = product.variants?.find(
            (v) => v._id?.toString() === item.variantId?.toString(),
          );

          if (existingVariant) {
            previousStock = existingVariant.stockQuantity;

            updatedProduct = await Product.findOneAndUpdate(
              {
                _id: item.productId,
                "variants._id": item.variantId,
              },
              {
                $inc: {
                  "variants.$.stockQuantity": item.quantity,
                  stockQuantity: item.quantity,
                },
              },
              {
                new: true,
                runValidators: true,
                session,
              },
            );

            const restoredVariant = updatedProduct?.variants?.find(
              (v) => v._id?.toString() === item.variantId?.toString(),
            );
            resultingStock = restoredVariant
              ? restoredVariant.stockQuantity
              : previousStock + item.quantity;
          } else {
            previousStock = product.stockQuantity;
            updatedProduct = await Product.findOneAndUpdate(
              { _id: item.productId },
              { $inc: { stockQuantity: item.quantity } },
              { new: true, runValidators: true, session },
            );
            resultingStock = updatedProduct
              ? updatedProduct.stockQuantity
              : previousStock + item.quantity;
          }
        } else {
          previousStock = product.stockQuantity;
          resultingStock = previousStock + item.quantity;

          updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.productId,
              stockQuantity: previousStock,
            },
            {
              $inc: { stockQuantity: item.quantity },
            },
            {
              new: true,
              runValidators: true,
              session,
            },
          );
        }

        if (!updatedProduct) {
          throw new AppError(
            httpStatus.CONFLICT,
            `Stock changed while cancelling "${item.name}". Please retry.`,
          );
        }

        await InventoryMovement.create(
          [
            {
              productId: item.productId,
              variantId: item.variantId,
              variantWeight: item.weight || item.size || "",
              variantSize: item.size || item.weight || "",
              movementType: INVENTORY_MOVEMENT_TYPE.INCREASE,
              quantity: item.quantity,
              previousStock,
              resultingStock: updatedProduct.stockQuantity,
              reason: `Order ${order.orderNumber} cancelled`,
              performedBy: actor.id,
            },
          ],
          { session },
        );
      }

      cancelledOrder = order;
    });

    if (!cancelledOrder) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Order cancellation failed",
      );
    }

    const orderToNotify: TOrder = cancelledOrder;

    // Send the cancellation email only after the transaction commits.
    // Email failure must not undo the cancellation or fail the request.
    try {
      await orderNotification.notifyOrderCancelled(orderToNotify);
    } catch (error) {
      console.error(
        `Failed to send cancellation email for ${orderToNotify.orderNumber}:`,
        error,
      );
    }

    if (actor.role === "user") {
      void notificationService
        .notifyAdmins({
          type: NOTIFICATION_TYPE.ORDER_CANCELLED,
          title: "Order Cancelled by Customer",
          message: `Customer cancelled order ${orderToNotify.orderNumber}.`,
          entityType: NOTIFICATION_ENTITY_TYPE.ORDER,
          entityId: orderId,
          actionUrl: "/dashboard/ecommerce/orders",
          metadata: {
            orderNumber: orderToNotify.orderNumber,
            userId: orderToNotify.userId,
          },
        })
        .catch((err) =>
          console.error("Failed to notify admins of customer order cancellation:", err),
        );
    } else {
      void notificationService
        .createNotification({
          recipient: orderToNotify.userId,
          type: NOTIFICATION_TYPE.ORDER_CANCELLED,
          title: `Order Cancelled: ${orderToNotify.orderNumber}`,
          message: `Your order ${orderToNotify.orderNumber} has been cancelled.`,
          entityType: NOTIFICATION_ENTITY_TYPE.ORDER,
          entityId: orderId,
          actionUrl: "/dashboard/my-orders",
          metadata: {
            orderNumber: orderToNotify.orderNumber,
            status: ORDER_STATUS.CANCELLED,
          },
        })
        .catch((err) =>
          console.error("Failed to notify customer of order cancellation:", err),
        );
    }

    return cancelledOrder;
  } finally {
    await session.endSession();
  }
};

const updateOrderStatus = async (
  orderId: string,
  newStatus: TOrderStatus,
) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  const previousStatus = order.status;

  // Avoid unnecessary database writes and duplicate emails.
  if (previousStatus === newStatus) {
    return order;
  }

  if (!isAllowedOrderStatusTransition(previousStatus, newStatus)) {
    const allowed = getAllowedOrderStatusTransitions(previousStatus);
    const allowedText = allowed.length
      ? allowed.join(", ")
      : "none (terminal state)";
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot transition order from "${previousStatus}" to "${newStatus}". Allowed next statuses: ${allowedText}.`,
    );
  }

  // If transitioning to cancelled, delegate to cancelOrder to safely restore inventory
  if (newStatus === ORDER_STATUS.CANCELLED) {
    return cancelOrder(
      orderId,
      { id: "admin", role: "admin" },
      "Cancelled by administrator via status update",
    );
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: orderId, status: previousStatus },
    { $set: { status: newStatus } },
    { new: true, runValidators: true },
  );

  if (!updatedOrder) {
    const latest = await Order.findById(orderId);
    if (!latest)
      throw new AppError(httpStatus.NOT_FOUND, "Order not found");
    if (latest.status === newStatus) return latest;
    throw new AppError(
      httpStatus.CONFLICT,
      "Order status was modified concurrently. Please refresh and try again.",
    );
  }

  // The status is saved, so email failure must not undo the update.
  try {
    await orderNotification.notifyOrderStatusUpdated(
      updatedOrder,
      previousStatus,
    );
  } catch (error) {
    console.error(
      `Failed to send status update email for ${updatedOrder.orderNumber}:`,
      error,
    );
  }

  // Notify customer of order status transition
  void notificationService
    .createNotification({
      recipient: updatedOrder.userId,
      type: NOTIFICATION_TYPE.ORDER_STATUS_CHANGED,
      title: `Order Status: ${newStatus.toUpperCase()}`,
      message: `Your order ${updatedOrder.orderNumber} is now "${newStatus}".`,
      entityType: NOTIFICATION_ENTITY_TYPE.ORDER,
      entityId: updatedOrder._id.toString(),
      actionUrl: "/dashboard/my-orders",
      metadata: {
        orderNumber: updatedOrder.orderNumber,
        status: newStatus,
        previousStatus,
      },
    })
    .catch((err) =>
      console.error("Failed to notify customer of order status update:", err),
    );

  return updatedOrder;
};

const updatePaymentStatus = async (
  orderId: string,
  requestedPaymentStatus?: TPaymentStatus,
) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  const newPaymentStatus = requestedPaymentStatus ?? PAYMENT_STATUS.PAID;
  const previousPaymentStatus = order.paymentStatus;

  // Already in the requested payment status: return idempotently
  if (previousPaymentStatus === newPaymentStatus) {
    return order;
  }

  if (!isAllowedPaymentStatusTransition(previousPaymentStatus, newPaymentStatus)) {
    const allowed = getAllowedPaymentStatusTransitions(previousPaymentStatus);
    const allowedText = allowed.length
      ? allowed.join(", ")
      : "none (terminal state)";
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot transition payment status from "${previousPaymentStatus}" to "${newPaymentStatus}". Allowed next statuses: ${allowedText}.`,
    );
  }

  if (order.paymentMethod !== PAYMENT_METHOD.COD) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Manual payment status update is only available for COD orders",
    );
  }

  if (
    newPaymentStatus === PAYMENT_STATUS.PAID &&
    order.status === ORDER_STATUS.CANCELLED
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Payment cannot be confirmed for a cancelled order",
    );
  }

  const filter: Record<string, unknown> = {
    _id: orderId,
    paymentMethod: PAYMENT_METHOD.COD,
    paymentStatus: previousPaymentStatus,
  };

  if (newPaymentStatus === PAYMENT_STATUS.PAID) {
    filter.status = { $ne: ORDER_STATUS.CANCELLED };
  }

  const updatedOrder = await Order.findOneAndUpdate(
    filter,
    {
      $set: { paymentStatus: newPaymentStatus },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedOrder) {
    const latestOrder = await Order.findById(orderId);

    if (!latestOrder) {
      throw new AppError(httpStatus.NOT_FOUND, "Order not found");
    }

    if (latestOrder.paymentStatus === newPaymentStatus) {
      return latestOrder;
    }

    if (latestOrder.paymentMethod !== PAYMENT_METHOD.COD) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Manual payment status update is only available for COD orders",
      );
    }

    if (
      newPaymentStatus === PAYMENT_STATUS.PAID &&
      latestOrder.status === ORDER_STATUS.CANCELLED
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Payment cannot be confirmed for a cancelled order",
      );
    }

    throw new AppError(
      httpStatus.CONFLICT,
      "Payment status changed concurrently. Please refresh the order and try again.",
    );
  }

  if (newPaymentStatus === PAYMENT_STATUS.PAID) {
    try {
      await orderNotification.notifyPaymentConfirmed(updatedOrder);
    } catch (error) {
      console.error(
        `Failed to send payment confirmation email for ${updatedOrder.orderNumber}:`,
        error,
      );
    }

    // In-app notification to customer
    void notificationService
      .createNotification({
        recipient: updatedOrder.userId,
        type: NOTIFICATION_TYPE.ORDER_PAYMENT_CONFIRMED,
        title: `Payment Confirmed: ${updatedOrder.orderNumber}`,
        message: `Payment for order ${updatedOrder.orderNumber} (BDT ${updatedOrder.totalAmount}) has been confirmed.`,
        entityType: NOTIFICATION_ENTITY_TYPE.ORDER,
        entityId: updatedOrder._id.toString(),
        actionUrl: "/dashboard/my-orders",
        metadata: {
          orderNumber: updatedOrder.orderNumber,
          paymentStatus: newPaymentStatus,
        },
      })
      .catch((err) =>
        console.error("Failed to notify customer of payment confirmation:", err),
      );
  }

  return updatedOrder;
};

export const orderService = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getMyOrderById,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
};
