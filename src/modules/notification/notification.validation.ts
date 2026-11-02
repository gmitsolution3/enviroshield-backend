import { z } from "zod";

const notificationIdParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Notification ID is required"),
  }),
});

const notificationQuerySchema = z.object({
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      unreadOnly: z.string().optional(),
    })
    .optional(),
});

export const notificationValidation = {
  notificationIdParamsSchema,
  notificationQuerySchema,
};

