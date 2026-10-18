import { z } from "zod";
import { DELIVERY_ZONE } from "./order.constant";

const createOrderValidationSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID"),

          quantity: z
            .number()
            .int("Quantity must be a whole number")
            .min(1, "Quantity must be greater than zero")
            .max(99, "Quantity cannot exceed 99"),
        }),
      )
      .min(1, "An order must contain at least one item")
      .max(50, "An order cannot contain more than 50 items"),

    customer: z.object({
      name: z
        .string()
        .trim()
        .min(2, "Customer name must contain at least 2 characters")
        .max(100, "Customer name cannot exceed 100 characters"),

      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number"),
    }),

    deliveryAddress: z.object({
      addressLine: z
        .string()
        .trim()
        .min(5, "Address must contain at least 5 characters")
        .max(200, "Address cannot exceed 200 characters"),

      area: z
        .string()
        .trim()
        .min(2, "Area must contain at least 2 characters")
        .max(100, "Area cannot exceed 100 characters"),

      city: z
        .string()
        .trim()
        .min(2, "City must contain at least 2 characters")
        .max(100, "City cannot exceed 100 characters"),

      district: z
        .string()
        .trim()
        .min(2, "District must contain at least 2 characters")
        .max(100, "District cannot exceed 100 characters"),

      postalCode: z
        .string()
        .trim()
        .max(20, "Postal code cannot exceed 20 characters")
        .optional(),
    }),

    deliveryZone: z.enum([
      DELIVERY_ZONE.DHAKA,
      DELIVERY_ZONE.OUTSIDE_DHAKA,
    ]),

    customerNote: z
      .string()
      .trim()
      .max(1000, "Customer note cannot exceed 1000 characters")
      .optional(),
  }),
});


const orderIdParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID"),
  }),
});

const getOrdersQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .refine(
        (value) =>
          value === undefined ||
          (/^\d+$/.test(value) && Number(value) >= 1),
        "Page must be a positive integer",
      ),

    limit: z
      .string()
      .optional()
      .refine(
        (value) =>
          value === undefined ||
          (/^\d+$/.test(value) &&
            Number(value) >= 1 &&
            Number(value) <= 100),
        "Limit must be an integer between 1 and 100",
      ),

    status: z
      .enum([
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ])
      .optional(),

    paymentStatus: z
      .enum(["pending", "paid", "failed", "refunded"])
      .optional(),

    orderNumber: z.string().trim().min(1).optional(),
  }),
});



export const orderValidation = {
  createOrderValidationSchema,
  orderIdParamsSchema,
  getOrdersQuerySchema,
};