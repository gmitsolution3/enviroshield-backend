import { z } from "zod";

const ga4MeasurementIdRegex = /^G-[A-Z0-9]+$/i;
const gtmContainerIdRegex = /^GTM-[A-Z0-9]+$/i;
const metaPixelIdRegex = /^\d{8,20}$/;
const googleAdsConversionIdRegex = /^(AW-)?[0-9]+$/i;

export const updateSettingsValidationSchema = z.object({
  body: z.object({
    seo: z
      .object({
        siteName: z.string().trim().max(100).optional(),
        defaultTitle: z.string().trim().max(150).optional(),
        defaultDescription: z.string().trim().max(500).optional(),
        defaultOgImage: z.string().trim().optional(),
        googleVerificationToken: z.string().trim().max(200).optional(),
        bingVerificationToken: z.string().trim().max(200).optional(),
        defaultRobots: z
          .object({
            index: z.boolean(),
            follow: z.boolean(),
          })
          .optional(),
      })
      .optional(),

    analytics: z
      .object({
        ga4: z
          .object({
            enabled: z.boolean().optional(),
            measurementId: z
              .string()
              .trim()
              .refine(
                (val) => val === "" || ga4MeasurementIdRegex.test(val),
                {
                  message:
                    "Measurement ID must be in the format G-XXXXXXXXXX or left empty",
                },
              )
              .optional(),
            label: z.string().trim().max(100).optional(),
          })
          .optional(),
        gtm: z
          .object({
            enabled: z.boolean().optional(),
            containerId: z
              .string()
              .trim()
              .refine(
                (val) => val === "" || gtmContainerIdRegex.test(val),
                {
                  message:
                    "Container ID must be in the format GTM-XXXXXXX or left empty",
                },
              )
              .optional(),
          })
          .optional(),
      })
      .optional(),

    marketing: z
      .object({
        metaPixel: z
          .object({
            enabled: z.boolean().optional(),
            pixelId: z
              .string()
              .trim()
              .refine(
                (val) => val === "" || metaPixelIdRegex.test(val),
                {
                  message:
                    "Meta Pixel ID must be 8-20 numeric digits or left empty",
                },
              )
              .optional(),
          })
          .optional(),
        googleAds: z
          .object({
            enabled: z.boolean().optional(),
            conversionId: z
              .string()
              .trim()
              .refine(
                (val) =>
                  val === "" || googleAdsConversionIdRegex.test(val),
                {
                  message:
                    "Google Ads Conversion ID must be numeric (or AW-XXXXXXXXX) or left empty",
                },
              )
              .optional(),
            conversionLabels: z
              .object({
                contactForm: z.string().trim().max(100).optional(),
                quoteRequest: z.string().trim().max(100).optional(),
                consultationRequest: z.string().trim().max(100).optional(),
                phoneClick: z.string().trim().max(100).optional(),
                emailClick: z.string().trim().max(100).optional(),
                whatsappClick: z.string().trim().max(100).optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),

    consent: z
      .object({
        enabled: z.boolean().optional(),
        requireAnalyticsConsent: z.boolean().optional(),
        requireMarketingConsent: z.boolean().optional(),
        bannerTitle: z.string().trim().max(150).optional(),
        bannerDescription: z.string().trim().max(1000).optional(),
      })
      .optional(),
  }),
});
