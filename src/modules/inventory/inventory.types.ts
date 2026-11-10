import { Types } from "mongoose";

export type TInventoryMovementType =
  | "initial"
  | "increase"
  | "decrease";

export type TInventoryMovement = {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  variantWeight?: string;
  variantSize?: string;
  movementType: TInventoryMovementType;
  quantity: number;
  previousStock: number;
  resultingStock: number;
  reason: string;
  performedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
};
