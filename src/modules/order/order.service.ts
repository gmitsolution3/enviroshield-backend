
import { randomBytes } from "crypto";
import httpStatus from "http-status";
import mongoose, { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { DELIVERY_ZONE, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "./order.constant";
import type { TDeliveryZone } from "./order.types";
import Order from "./order.model";
import Product from "../product/product.model";
import { PRODUCT_STATUS } from "../product/product.constant";
import InventoryMovement from "../inventory/inventory.model";
import { INVENTORY_MOVEMENT_TYPE } from "../inventory/inventory.constant";

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
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid product ID");
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

    await session.withTransaction(async () => {
      const productIds = [...requestedQuantities.keys()].map(
        (id) => new Types.ObjectId(id),
      );

      const products = await Product.find({
        _id: { $in: productIds },
        status: PRODUCT_STATUS.PUBLISHED,
      })
        .select("_id name slug sku primaryImage price stockQuantity")
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
        items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
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

    return order;
  } finally {
    await session.endSession();
  }
};

export const orderService = {
  createOrder,
};