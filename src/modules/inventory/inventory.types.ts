import { Types } from "mongoose";

export type TInventoryMovementType =
  | "initial"
  | "increase"
  | "decrease";

export type TInventoryMovement = {
  productId: Types.ObjectId;
  movementType: TInventoryMovementType;
  quantity: number;
  previousStock: number;
  resultingStock: number;
  reason: string;
  performedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
};
