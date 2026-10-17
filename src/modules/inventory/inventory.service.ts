import httpStatus from "http-status";
import mongoose, { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import Product from "../product/product.model";
import { INVENTORY_MOVEMENT_TYPE } from "./inventory.constant";
import InventoryMovement from "./inventory.model";

type TAdjustStockPayload = {
  productId: string;
  movementType: "increase" | "decrease";
  quantity: number;
  reason: string;
  performedBy: string;
};

const adjustStock = async (payload: TAdjustStockPayload) => {
  if (!Types.ObjectId.isValid(payload.productId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid product ID");
  }

  if (!Types.ObjectId.isValid(payload.performedBy)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid admin ID");
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Quantity must be a positive whole number",
    );
  }

  const reason = payload.reason.trim();

  if (!reason) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A reason for the stock adjustment is required",
    );
  }

  if (
    payload.movementType !== INVENTORY_MOVEMENT_TYPE.INCREASE &&
    payload.movementType !== INVENTORY_MOVEMENT_TYPE.DECREASE
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid inventory movement type",
    );
  }

  const session = await mongoose.startSession();

  try {
    let result:
      | {
          product: NonNullable<
            Awaited<ReturnType<typeof Product.findById>>
          >;
          movement: InstanceType<typeof InventoryMovement>;
        }
      | undefined;

    await session.withTransaction(async () => {
      const product = await Product.findById(
        payload.productId,
      ).session(session);

      if (!product) {
        throw new AppError(httpStatus.NOT_FOUND, "Product not found");
      }

      const previousStock = product.stockQuantity;

      const resultingStock =
        payload.movementType === INVENTORY_MOVEMENT_TYPE.INCREASE
          ? previousStock + payload.quantity
          : previousStock - payload.quantity;

      if (resultingStock < 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Insufficient stock. Available quantity: ${previousStock}`,
        );
      }

      // Conditional update prevents a concurrent request from
      // changing stock based on an outdated quantity.
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stockQuantity: previousStock,
        },
        {
          $set: { stockQuantity: resultingStock },
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
          "Stock changed during this adjustment. Please retry.",
        );
      }

      const [movement] = await InventoryMovement.create(
        [
          {
            productId: product._id,
            movementType: payload.movementType,
            quantity: payload.quantity,
            previousStock,
            resultingStock,
            reason,
            performedBy: payload.performedBy,
          },
        ],
        { session },
      );

      result = {
        product: updatedProduct,
        movement,
      };
    });

    if (!result) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Stock adjustment could not be completed",
      );
    }

    return result;
  } finally {
    await session.endSession();
  }
};

export const inventoryService = {
  adjustStock,
};
