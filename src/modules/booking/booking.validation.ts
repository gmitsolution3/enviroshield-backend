import { z } from "zod";
import { BOOKING_STATUSES } from "./booking.constant";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

const createBookingValidationSchema = z.object({
  body: z
    .object({
      serviceId: objectIdSchema,
      project: z
        .object({
          location: z.string().trim().min(1).max(300),
          areaSize: z.number().finite().nonnegative().optional(),
          areaUnit: z.string().trim().min(1).max(50).optional(),
          message: z.string().trim().max(2000).optional(),
        })
        .strict(),
      isSiteVisit: z.boolean().optional(),
    })
    .strict(),
});

const bookingIdParamsSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

const bookingQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^[1-9]\d*$/).optional(),
    limit: z
      .string()
      .regex(/^[1-9]\d*$/)
      .refine((value) => value === undefined || Number(value) <= 100)
      .optional(),
    status: z.enum(BOOKING_STATUSES).optional(),
    bookingNumber: z.string().trim().min(1).optional(),
  }),
});

const updateBookingPriceValidationSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z
    .object({ finalPrice: z.number().finite().nonnegative() })
    .strict(),
});

const updateBookingStatusValidationSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z
    .object({ status: z.enum(BOOKING_STATUSES) })
    .strict(),
});

const updateBookingManagementValidationSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z
    .object({
      isSiteVisit: z.boolean().optional(),
      siteVisitDate: z.coerce.date().optional(),
      adminNotes: z.string().trim().max(2000).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one management field is required",
    }),
});

const cancelBookingValidationSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const bookingValidation = {
  createBookingValidationSchema,
  bookingIdParamsSchema,
  bookingQuerySchema,
  updateBookingPriceValidationSchema,
  updateBookingStatusValidationSchema,
  updateBookingManagementValidationSchema,
  cancelBookingValidationSchema,
};
