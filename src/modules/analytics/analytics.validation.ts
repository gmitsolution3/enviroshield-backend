import { z } from "zod";
import { VALID_ANALYTICS_PERIODS } from "./analytics.constant";

const getAnalyticsQuerySchema = z.object({
  query: z.object({
    period: z.enum(VALID_ANALYTICS_PERIODS).optional(),
  }),
});

export const analyticsValidation = {
  getAnalyticsQuerySchema,
};
