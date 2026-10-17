import { z } from "zod";

const createCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Category name is required"),
    slug: z.string().min(1, "Category slug is required"),
  }),
});

const updateCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Category name is required").optional(),
    slug: z.string().min(1, "Category slug is required").optional(),
  }),
});

const categoryQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const categoryIdParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Category ID is required"),
  }),
});

const categorySlugParamsSchema = z.object({
  params: z.object({
    slug: z.string().min(1, "Category slug is required"),
  }),
});

export const categoryValidation = {
  createCategoryValidationSchema,
  updateCategoryValidationSchema,
  categoryQuerySchema,
  categoryIdParamsSchema,
  categorySlugParamsSchema,
};