import { Document, Model, Schema, model } from "mongoose";
import { ISettings } from "./settings.types";

export interface ISettingsDocument extends ISettings, Document {}

export interface ISettingsModel extends Model<ISettingsDocument> {
  getSettings(): Promise<ISettingsDocument>;
}

const defaultSettings: ISettings = {
  seo: {
    siteName: "Enviroshield",
    defaultTitle: "Enviroshield",
    defaultDescription:
      "Enviroshield provides waterproofing, waterproofing paint, heatproofing, epoxy and PU flooring, injection grouting, expansion joint sealing, sports flooring, polished concrete, 3D epoxy floors, floor hardener, and ETP coating in Bangladesh.",
    defaultOgImage: "/images/logo.png",
    googleVerificationToken: "",
    bingVerificationToken: "",
    defaultRobots: {
      index: true,
      follow: true,
    },
  },
  analytics: {
    ga4: {
      enabled: false,
      measurementId: "",
      label: "",
    },
    gtm: {
      enabled: false,
      containerId: "",
    },
  },
  marketing: {
    metaPixel: {
      enabled: false,
      pixelId: "",
    },
    googleAds: {
      enabled: false,
      conversionId: "",
      conversionLabels: {
        contactForm: "",
        quoteRequest: "",
        consultationRequest: "",
        phoneClick: "",
        emailClick: "",
        whatsappClick: "",
      },
    },
  },
  consent: {
    enabled: true,
    requireAnalyticsConsent: true,
    requireMarketingConsent: true,
    bannerTitle: "Cookie & Tracking Preferences",
    bannerDescription:
      "We use cookies and tracking technologies to enhance your experience, analyze site usage, and support our marketing efforts.",
  },
};

const settingsSchema = new Schema<ISettingsDocument, ISettingsModel>(
  {
    seo: {
      siteName: { type: String, default: defaultSettings.seo.siteName },
      defaultTitle: { type: String, default: defaultSettings.seo.defaultTitle },
      defaultDescription: {
        type: String,
        default: defaultSettings.seo.defaultDescription,
      },
      defaultOgImage: {
        type: String,
        default: defaultSettings.seo.defaultOgImage,
      },
      googleVerificationToken: { type: String, default: "" },
      bingVerificationToken: { type: String, default: "" },
      defaultRobots: {
        index: { type: Boolean, default: true },
        follow: { type: Boolean, default: true },
      },
    },
    analytics: {
      ga4: {
        enabled: { type: Boolean, default: false },
        measurementId: { type: String, default: "" },
        label: { type: String, default: "" },
      },
      gtm: {
        enabled: { type: Boolean, default: false },
        containerId: { type: String, default: "" },
      },
    },
    marketing: {
      metaPixel: {
        enabled: { type: Boolean, default: false },
        pixelId: { type: String, default: "" },
      },
      googleAds: {
        enabled: { type: Boolean, default: false },
        conversionId: { type: String, default: "" },
        conversionLabels: {
          contactForm: { type: String, default: "" },
          quoteRequest: { type: String, default: "" },
          consultationRequest: { type: String, default: "" },
          phoneClick: { type: String, default: "" },
          emailClick: { type: String, default: "" },
          whatsappClick: { type: String, default: "" },
        },
      },
    },
    consent: {
      enabled: { type: Boolean, default: true },
      requireAnalyticsConsent: { type: Boolean, default: true },
      requireMarketingConsent: { type: Boolean, default: true },
      bannerTitle: {
        type: String,
        default: defaultSettings.consent.bannerTitle,
      },
      bannerDescription: {
        type: String,
        default: defaultSettings.consent.bannerDescription,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

settingsSchema.static("getSettings", async function getSettings(): Promise<ISettingsDocument> {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(defaultSettings);
  }
  return settings;
});

export const Settings = model<ISettingsDocument, ISettingsModel>(
  "Settings",
  settingsSchema,
);

