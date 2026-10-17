
import { model, Schema } from "mongoose";
import {
  INVENTORY_MOVEMENT_TYPE,
} from "./inventory.constant";
import { TInventoryMovement } from "./inventory.types";

const inventoryMovementSchema = new Schema<TInventoryMovement>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    movementType: {
      type: String,
      enum: Object.values(INVENTORY_MOVEMENT_TYPE),
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },

    resultingStock: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    performedBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    strict: true,
    timestamps: true,
    versionKey: false,
  },
);

inventoryMovementSchema.index({
  productId: 1,
  createdAt: -1,
});

inventoryMovementSchema.index({
  performedBy: 1,
  createdAt: -1,
});

const InventoryMovement = model<TInventoryMovement>(
  "InventoryMovement",
  inventoryMovementSchema,
);

export default InventoryMovement;
