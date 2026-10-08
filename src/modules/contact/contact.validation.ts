import { z } from "zod";

const projectLocationSchema = z.object({
  address: z.string().trim().optional(),
  area: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  country: z.string().trim().min(1, "Country is required"),
});

export const createContactValidationSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(1, "Full name is required"),

    phoneNumber: z.string().trim().min(1, "Phone number is required"),

    email: z.string().trim().email("Invalid email address"),

    companyName: z.string().trim().optional(),

    jobTitle: z.string().trim().optional(),

    serviceId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid service ID")
      .optional(),

    projectName: z.string().trim().optional(),

    projectType: z
      .enum([
        "residential",
        "commercial",
        "industrial",
        "warehouse",
        "factory",
        "hospital",
        "school",
        "hotel",
        "office",
        "shopping-mall",
        "sports-facility",
        "other",
      ])
      .optional(),

    projectLocation: projectLocationSchema.optional(),

    projectAreaSize: z
      .number()
      .nonnegative("Project area size cannot be negative")
      .optional(),

    projectAreaUnit: z.enum(["sqft", "sqm"]).optional(),

    siteVisitRequired: z.boolean().optional(),

    projectTimeline: z
      .enum([
        "immediate",
        "within-1-month",
        "1-3-months",
        "3-6-months",
        "6-plus-months",
        "not-decided",
      ])
      .optional(),

    message: z.string().trim().optional(),
  }),
});

export const updateContactValidationSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .optional(),

    phoneNumber: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .optional(),

    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .optional(),

    companyName: z.string().trim().optional(),

    jobTitle: z.string().trim().optional(),

    serviceId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid service ID")
      .optional(),

    projectName: z.string().trim().optional(),

    projectType: z
      .enum([
        "residential",
        "commercial",
        "industrial",
        "warehouse",
        "factory",
        "hospital",
        "school",
        "hotel",
        "office",
        "shopping-mall",
        "sports-facility",
        "other",
      ])
      .optional(),

    projectLocation: projectLocationSchema.optional(),

    projectAreaSize: z
      .number()
      .nonnegative("Project area size cannot be negative")
      .optional(),

    projectAreaUnit: z.enum(["sqft", "sqm"]).optional(),

    siteVisitRequired: z.boolean().optional(),

    projectTimeline: z
      .enum([
        "immediate",
        "within-1-month",
        "1-3-months",
        "3-6-months",
        "6-plus-months",
        "not-decided",
      ])
      .optional(),

    message: z.string().trim().optional(),

    status: z
      .enum([
        "new",
        "contacted",
        "qualified",
        "site-visit",
        "proposal-sent",
        "won",
        "lost",
      ])
      .optional(),

    source: z
      .enum(["website", "phone", "referral", "other"])
      .optional(),

    adminNotes: z.string().trim().optional(),
  }),
});

export const contactIdValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid contact ID"),
  }),
});

export const contactQueryValidationSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z
      .enum([
        "new",
        "contacted",
        "qualified",
        "site-visit",
        "proposal-sent",
        "won",
        "lost",
      ])
      .optional(),
    source: z
      .enum(["website", "phone", "referral", "other"])
      .optional(),
    serviceId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid service ID")
      .optional(),
  }),
});
