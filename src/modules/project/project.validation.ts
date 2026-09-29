import { z } from "zod";
import { PROJECT_STATUS } from "./project.constant";

const projectImageSchema = z.object({
  url: z.string().min(1, "Image URL is required"),
  alt: z.string().min(1, "Image alt text is required"),
  caption: z.string().optional(),
});

const projectLocationSchema = z.object({
  city: z.string().min(1, "City is required"),
  area: z.string().optional(),
  country: z.string().min(1, "Country is required"),
});

const projectClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  description: z.string().optional(),
  logo: projectImageSchema.optional(),
});

const projectSEOSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().url().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().url().optional(),
  noIndex: z.boolean().optional(),
});

const createProjectValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Project title is required"),

    slug: z.string().min(1, "Project slug is required"),

    primaryImage: projectImageSchema,

    description: z.string().min(1, "Project description is required"),

    location: projectLocationSchema,

    completionDate: z.coerce.date(),

    gallery: z.array(projectImageSchema).optional(),

    client: projectClientSchema,

    serviceId: z.string().min(1, "Service ID is required"),

    status: z
      .enum([
        PROJECT_STATUS.DRAFT,
        PROJECT_STATUS.PUBLISHED,
      ])
      .optional(),

    isFeatured: z.boolean().optional(),

    seo: projectSEOSchema.optional(),
  }),
});

const updateProjectValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),

    slug: z.string().min(1).optional(),

    primaryImage: projectImageSchema.optional(),

    description: z.string().min(1).optional(),

    location: projectLocationSchema.optional(),

    completionDate: z.coerce.date().optional(),

    gallery: z.array(projectImageSchema).optional(),

    client: projectClientSchema.optional(),

    serviceId: z.string().min(1).optional(),

    status: z
      .enum([
        PROJECT_STATUS.DRAFT,
        PROJECT_STATUS.PUBLISHED,
      ])
      .optional(),

    isFeatured: z.boolean().optional(),

    seo: projectSEOSchema.optional(),
  }),
});

const projectQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const projectIdParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Project ID is required"),
  }),
});

const projectSlugParamsSchema = z.object({
  params: z.object({
    slug: z.string().min(1, "Project slug is required"),
  }),
});

const projectServiceParamsSchema = z.object({
  params: z.object({
    serviceId: z.string().min(1, "Service ID is required"),
  }),
});

export const projectValidation = {
  createProjectValidationSchema,
  updateProjectValidationSchema,
  projectQuerySchema,
  projectIdParamsSchema,
  projectSlugParamsSchema,
  projectServiceParamsSchema,
};