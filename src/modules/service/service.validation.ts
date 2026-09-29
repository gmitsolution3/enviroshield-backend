import { z } from "zod";
import { SERVICE_STATUS } from "./service.constant";

const serviceImageSchema = z.object({
  url: z.string().min(1, "Image URL is required"),
  alt: z.string().min(1, "Image alt text is required"),
  caption: z.string().optional(),
});

const serviceItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
});

const serviceSectionSchema = z.object({
  image: serviceImageSchema,
  items: z
    .array(serviceItemSchema)
    .min(1, "At least one item is required"),
});

const serviceSEOSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().url().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().url().optional(),
  noIndex: z.boolean().optional(),
});

const createServiceValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Service name is required"),

    slug: z.string().min(1, "Service slug is required"),

    isFeatured: z.boolean().optional(),

    primaryImage: serviceImageSchema,

    detailHeading: z
      .string()
      .min(1, "Service detail heading is required"),

    description: z.string().min(1, "Service description is required"),

    whyEnviroshield: serviceSectionSchema,

    process: serviceSectionSchema,

    benefits: serviceSectionSchema,

    status: z
      .enum([SERVICE_STATUS.DRAFT, SERVICE_STATUS.PUBLISHED])
      .optional(),

    publishedAt: z.coerce.date().nullable().optional(),

    seo: serviceSEOSchema.optional(),
  }),
});

const updateServiceValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),

    slug: z.string().min(1).optional(),

    isFeatured: z.boolean().optional(),

    primaryImage: serviceImageSchema.optional(),

    detailHeading: z.string().min(1).optional(),

    description: z.string().min(1).optional(),

    whyEnviroshield: serviceSectionSchema.optional(),

    process: serviceSectionSchema.optional(),

    benefits: serviceSectionSchema.optional(),

    status: z
      .enum([SERVICE_STATUS.DRAFT, SERVICE_STATUS.PUBLISHED])
      .optional(),

    publishedAt: z.coerce.date().nullable().optional(),

    seo: serviceSEOSchema.optional(),
  }),
});

const serviceQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const serviceIdParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Service ID is required"),
  }),
});

const serviceSlugParamsSchema = z.object({
  params: z.object({
    slug: z.string().min(1, "Service slug is required"),
  }),
});

export const serviceValidation = {
  createServiceValidationSchema,
  updateServiceValidationSchema,
  serviceQuerySchema,
  serviceIdParamsSchema,
  serviceSlugParamsSchema,
};
