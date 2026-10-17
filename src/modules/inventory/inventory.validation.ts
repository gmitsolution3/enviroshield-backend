
import { z } from "zod";
import { INVENTORY_MOVEMENT_TYPE } from "./inventory.constant";

const adjustStockValidationSchema = z.object({
  body: z.object({
    movementType: z.enum([
      INVENTORY_MOVEMENT_TYPE.INCREASE,
      INVENTORY_MOVEMENT_TYPE.DECREASE,
    ]),

    quantity: z
      .number()
      .int("Quantity must be a whole number")
      .positive("Quantity must be greater than zero"),

    reason: z
      .string()
      .trim()
      .min(3, "Reason must contain at least 3 characters")
      .max(500, "Reason cannot exceed 500 characters"),
  }),
  params: z.object({
    productId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID"),
  }),
});

export const inventoryValidation = {
  adjustStockValidationSchema,
};
