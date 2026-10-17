
import { z } from "zod";

const cartItemSchema = z.object({
  productId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID"),

  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than zero"),
});

const calculateCartValidationSchema = z.object({
  body: z.object({
    items: z
      .array(cartItemSchema)
      .min(1, "Cart must contain at least one item")
      .max(50, "Cart cannot contain more than 50 items"),
  }),
});

export const cartValidation = {
  calculateCartValidationSchema,
};
