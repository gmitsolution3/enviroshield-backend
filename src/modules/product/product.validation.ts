import { z } from "zod";
import { PRODUCT_STATUS } from "./product.constant";

const productImageSchema = z.object({
  url: z.string().trim().min(1, "Image URL is required"),
  publicId: z
    .string()
    .trim()
    .min(1, "Cloudinary public ID is required"),
  alt: z.string().trim().min(1, "Image alt text is required"),
});

const productSEOSchema = z.object({
  metaTitle: z.string().trim().min(1, "Meta title is required"),
  metaDescription: z
    .string()
    .trim()
    .min(1, "Meta description is required"),
  keywords: z.array(
    z.string().trim().min(1, "Keyword cannot be empty"),
  ),
  ogTitle: z.string().trim().min(1, "Open Graph title is required"),
  ogDescription: z
    .string()
    .trim()
    .min(1, "Open Graph description is required"),
  ogImage: z.string().url("Open Graph image must be a valid URL"),
  ogImagePublicId: z
    .string()
    .trim()
    .min(1, "Open Graph image public ID is required"),
  noIndex: z.boolean(),
});

const productDescriptionSchema = z.record(z.string(), z.unknown());

const createProductValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Product name is required"),

    slug: z.string().trim().min(1, "Product slug is required"),

    sku: z.string().trim().min(1, "Product SKU is required"),

    categoryId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID"),

    shortDescription: z
      .string()
      .trim()
      .min(1, "Short description is required"),

    description: productDescriptionSchema,

    primaryImage: productImageSchema,

    gallery: z.array(productImageSchema),

    price: z.number().finite().nonnegative(),

    costPrice: z.number().finite().nonnegative(),

    weight: z.number().finite().nonnegative(),

    tdsUrl: z.string().url("TDS URL must be a valid URL"),

    tdsPublicId: z
      .string()
      .trim()
      .min(1, "TDS public ID is required"),

    stockQuantity: z.number().int().nonnegative(),

    lowStockThreshold: z.number().int().nonnegative(),

    status: z.enum([PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.PUBLISHED]),

    isFeatured: z.boolean(),

    publishedAt: z.coerce.date().nullable(),

    seo: productSEOSchema,
  }),
});

const updateProductValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),

    slug: z.string().trim().min(1).optional(),

    sku: z.string().trim().min(1).optional(),

    categoryId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID")
      .optional(),

    shortDescription: z.string().trim().min(1).optional(),

    description: productDescriptionSchema.optional(),

    primaryImage: productImageSchema.optional(),

    gallery: z.array(productImageSchema).optional(),

    price: z.number().finite().nonnegative().optional(),

    costPrice: z.number().finite().nonnegative().optional(),

    weight: z.number().finite().nonnegative().optional(),

    tdsUrl: z.string().url("TDS URL must be a valid URL").optional(),

    tdsPublicId: z.string().trim().min(1).optional(),

    stockQuantity: z.number().int().nonnegative().optional(),

    lowStockThreshold: z.number().int().nonnegative().optional(),

    status: z
      .enum([PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.PUBLISHED])
      .optional(),

    isFeatured: z.boolean().optional(),

    publishedAt: z.coerce.date().nullable().optional(),

    seo: productSEOSchema.partial().optional(),
  }),
});

const productQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^[1-9]\d*$/)
      .optional(),

    limit: z
      .string()
      .regex(/^[1-9]\d*$/)
      .optional(),

    search: z.string().trim().min(1).optional(),

    categoryId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID")
      .optional(),

    status: z
      .enum([PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.PUBLISHED])
      .optional(),

    isFeatured: z.enum(["true", "false"]).optional(),

    minPrice: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .optional(),

    maxPrice: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .optional(),

    inStock: z.enum(["true", "false"]).optional(),

    sortBy: z
      .enum([
        "name",
        "price",
        "createdAt",
        "updatedAt",
        "publishedAt",
        "stockQuantity",
        "weight",
      ])
      .optional(),

    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

const productIdParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID"),
  }),
});

const productSlugParamsSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1, "Product slug is required"),
  }),
});

export const productValidation = {
  createProductValidationSchema,
  updateProductValidationSchema,
  productQuerySchema,
  productIdParamsSchema,
  productSlugParamsSchema,
};
