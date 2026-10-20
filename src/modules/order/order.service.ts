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
} from "./order.constant";
import Order from "./order.model";
import { orderNotification } from "./order.notification";
import type {
  TDeliveryZone,
  TOrder,
  TOrderStatus,
} from "./order.types";

type TCreateOrderPayload = {
  items: {
    productId: string;
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
) => {
  if (!user.id || !user.email) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Authenticated customer details are required",
    );
  }

  // Merge duplicate product IDs before validating stock.
  const requestedQuantities = new Map<string, number>();

  for (const item of payload.items) {
    if (!Types.ObjectId.isValid(item.productId)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Invalid product ID",
      );
    }

    const productId = item.productId.toLowerCase();
    const combinedQuantity =
      (requestedQuantities.get(productId) ?? 0) + item.quantity;

    if (combinedQuantity > 99) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Combined quantity for a product cannot exceed 99",
      );
    }

    requestedQuantities.set(productId, combinedQuantity);
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

      const productIds = [...requestedQuantities.keys()].map(
        (id) => new Types.ObjectId(id),
      );

      const products = await Product.find({
        _id: { $in: productIds },
        status: PRODUCT_STATUS.PUBLISHED,
      })
        .select(
          "_id name slug sku primaryImage price stockQuantity lowStockThreshold",
        )
        .session(session);

      if (products.length !== productIds.length) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "One or more products are unavailable",
        );
      }

      const productMap = new Map(
        products.map((product) => [product._id.toString(), product]),
      );

      const items = [];

      for (const [productId, quantity] of requestedQuantities) {
        const product = productMap.get(productId);

        if (!product) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            "One or more products are unavailable",
          );
        }

        // Conditional stock deduction prevents overselling.
        const previousStock = product.stockQuantity;

        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: product._id,
            status: PRODUCT_STATUS.PUBLISHED,
            stockQuantity: { $gte: quantity },
          },
          {
            $inc: { stockQuantity: -quantity },
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

        const resultingStock = updatedProduct.stockQuantity;

        // Alert only when stock crosses from above the threshold
        // to the threshold or below it.
        const crossedLowStockThreshold =
          previousStock > product.lowStockThreshold &&
          resultingStock <= product.lowStockThreshold;

        if (crossedLowStockThreshold) {
          lowStockAlerts.push({
            name: product.name,
            sku: product.sku,
            stockQuantity: resultingStock,
            lowStockThreshold: product.lowStockThreshold,
          });
        }

        const unitPrice = product.price;
        const lineTotal = Number((unitPrice * quantity).toFixed(2));

        items.push({
          productId: product._id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          primaryImage: product.primaryImage,
          unitPrice,
          quantity,
          lineTotal,
        });

        await InventoryMovement.create(
          [
            {
              productId: product._id,
              movementType: INVENTORY_MOVEMENT_TYPE.DECREASE,
              quantity,
              previousStock,
              resultingStock,
              reason: "Customer order placed",
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

  order.status = newStatus;
  await order.save();

  // The status is saved, so email failure must not undo the update.
  try {
    await orderNotification.notifyOrderStatusUpdated(
      order,
      previousStatus,
    );
  } catch (error) {
    console.error(
      `Failed to send status update email for ${order.orderNumber}:`,
      error,
    );
  }

  return order;
};

const updatePaymentStatus = async (orderId: string) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (order.paymentMethod !== PAYMENT_METHOD.COD) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Manual payment confirmation is only available for COD orders",
    );
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Payment cannot be confirmed for a cancelled order",
    );
  }

  // Already paid: return without sending another email.
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    return order;
  }

  // Atomically confirm payment only if it is still pending
  // and the order has not been cancelled.
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentMethod: PAYMENT_METHOD.COD,
      paymentStatus: PAYMENT_STATUS.PENDING,
      status: { $ne: ORDER_STATUS.CANCELLED },
    },
    {
      $set: { paymentStatus: PAYMENT_STATUS.PAID },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedOrder) {
    // Another request may have confirmed payment first.
    const latestOrder = await Order.findById(orderId);

    if (!latestOrder) {
      throw new AppError(httpStatus.NOT_FOUND, "Order not found");
    }

    if (latestOrder.paymentStatus === PAYMENT_STATUS.PAID) {
      return latestOrder;
    }

    if (latestOrder.paymentMethod !== PAYMENT_METHOD.COD) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Manual payment confirmation is only available for COD orders",
      );
    }

    if (latestOrder.status === ORDER_STATUS.CANCELLED) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Payment cannot be confirmed for a cancelled order",
      );
    }

    throw new AppError(
      httpStatus.CONFLICT,
      "Payment status changed. Please refresh the order and try again.",
    );
  }

  // Payment is already saved. Email failure must not undo it.
  try {
    await orderNotification.notifyPaymentConfirmed(updatedOrder);
  } catch (error) {
    console.error(
      `Failed to send payment confirmation email for ${updatedOrder.orderNumber}:`,
      error,
    );
  }

  return updatedOrder;
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

        const previousStock = product.stockQuantity;
        const resultingStock = previousStock + item.quantity;

        const updatedProduct = await Product.findOneAndUpdate(
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

    return cancelledOrder;
  } finally {
    await session.endSession();
  }
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
