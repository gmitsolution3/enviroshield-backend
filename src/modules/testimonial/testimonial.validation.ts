import { z } from "zod";
import { TESTIMONIAL_STATUS } from "./testimonial.constant";

const testimonialImageSchema = z.object({
  url: z.string().min(1, "Image URL is required"),
  alt: z.string().min(1, "Image alt text is required"),
});

const createTestimonialValidationSchema = z.object({
  body: z.object({
    clientName: z.string().min(1, "Client name is required"),

    clientImage: testimonialImageSchema.optional(),

    rating: z
      .number()
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),

    content: z.string().min(1, "Testimonial content is required"),

    status: z
      .enum([
        TESTIMONIAL_STATUS.DRAFT,
        TESTIMONIAL_STATUS.PUBLISHED,
      ])
      .optional(),
  }),
});

const updateTestimonialValidationSchema = z.object({
  body: z.object({
    clientName: z
      .string()
      .min(1, "Client name is required")
      .optional(),

    clientImage: testimonialImageSchema.optional(),

    rating: z
      .number()
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5")
      .optional(),

    content: z
      .string()
      .min(1, "Testimonial content is required")
      .optional(),

    status: z
      .enum([
        TESTIMONIAL_STATUS.DRAFT,
        TESTIMONIAL_STATUS.PUBLISHED,
      ])
      .optional(),
  }),
});

const testimonialQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const testimonialIdParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Testimonial ID is required"),
  }),
});

export const testimonialValidation = {
  createTestimonialValidationSchema,
  updateTestimonialValidationSchema,
  testimonialQuerySchema,
  testimonialIdParamsSchema,
};