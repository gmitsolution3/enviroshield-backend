import { z } from "zod";
import { BLOG_STATUS } from "./blog.constant";

const blogImageSchema = z.object({
  url: z.string().min(1, "Image URL is required"),
  alt: z.string().min(1, "Image alt text is required"),
  caption: z.string().optional(),
});

const blogSEOSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().url().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().url().optional(),
  noIndex: z.boolean().optional(),
});

const createBlogValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().min(1, "Slug is required"),
    excerpt: z.string().min(1, "Excerpt is required"),
    content: z.record(z.string(), z.unknown()),
    coverImage: blogImageSchema,
    tags: z.array(z.string()).optional(),
    status: z
      .enum([BLOG_STATUS.DRAFT, BLOG_STATUS.PUBLISHED])
      .optional(),
    publishedAt: z.coerce.date().nullable().optional(),
    seo: blogSEOSchema.optional(),
  }),
});

const updateBlogValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    excerpt: z.string().min(1).optional(),
    content: z.record(z.string(), z.unknown()).optional(),
    coverImage: blogImageSchema.optional(),
    tags: z.array(z.string()).optional(),
    status: z
      .enum([BLOG_STATUS.DRAFT, BLOG_STATUS.PUBLISHED])
      .optional(),
    publishedAt: z.coerce.date().nullable().optional(),
    seo: blogSEOSchema.optional(),
  }),
});

const blogQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const blogIdParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Blog ID is required"),
  }),
});

const blogSlugParamsSchema = z.object({
  params: z.object({
    slug: z.string().min(1, "Blog slug is required"),
  }),
});

export const blogValidation = {
  createBlogValidationSchema,
  updateBlogValidationSchema,
  blogQuerySchema,
  blogIdParamsSchema,
  blogSlugParamsSchema,
};
