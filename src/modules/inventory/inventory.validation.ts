
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


const getMovementHistoryValidationSchema = z.object({
  params: z.object({
    productId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID"),
  }),
  query: z.object({
    page: z
      .string()
      .optional()
      .default("1")
      .refine(
        (value) => /^\d+$/.test(value) && Number(value) >= 1,
        "Page must be a positive integer",
      ),

    limit: z
      .string()
      .optional()
      .default("20")
      .refine(
        (value) =>
          /^\d+$/.test(value) &&
          Number(value) >= 1 &&
          Number(value) <= 100,
        "Limit must be an integer between 1 and 100",
      ),
  }),
});


const getLowStockProductsValidationSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default("1")
      .refine(
        (value) => /^\d+$/.test(value) && Number(value) >= 1,
        "Page must be a positive integer",
      ),

    limit: z
      .string()
      .optional()
      .default("20")
      .refine(
        (value) =>
          /^\d+$/.test(value) &&
          Number(value) >= 1 &&
          Number(value) <= 100,
        "Limit must be an integer between 1 and 100",
      ),
  }),
});

export const inventoryValidation = {
  adjustStockValidationSchema,
  getMovementHistoryValidationSchema,
  getLowStockProductsValidationSchema,
};