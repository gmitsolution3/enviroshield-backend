import { encrypt } from "../../utils/crypto";
import { Settings } from "./settings.model";
import { ISettings, IPublicSettings } from "./settings.types";

export interface IAdminSettingsResponse extends Omit<ISettings, "marketing"> {
  marketing: {
    metaPixel: {
      enabled: boolean;
      pixelId: string;
      capi: {
        enabled: boolean;
        accessTokenConfigured: boolean;
        testEventCode: string;
      };
    };
    googleAds: ISettings["marketing"]["googleAds"];
  };
}

export interface IUpdateSettingsPayload extends Partial<Omit<ISettings, "marketing">> {
  marketing?: {
    metaPixel?: {
      enabled?: boolean;
      pixelId?: string;
      capi?: {
        enabled?: boolean;
        accessToken?: string;
        clearAccessToken?: boolean;
        testEventCode?: string;
      };
    };
    googleAds?: Partial<ISettings["marketing"]["googleAds"]>;
  };
}

const formatAdminSettings = (settingsObj: ISettings): IAdminSettingsResponse => {
  const capi = settingsObj.marketing?.metaPixel?.capi;
  const rawToken = capi?.accessToken;
  const isConfigured = Boolean(rawToken && rawToken.trim().length > 0);

  return {
    ...settingsObj,
    marketing: {
      ...settingsObj.marketing,
      metaPixel: {
        enabled: Boolean(settingsObj.marketing?.metaPixel?.enabled),
        pixelId: settingsObj.marketing?.metaPixel?.pixelId || "",
        capi: {
          enabled: Boolean(capi?.enabled),
          accessTokenConfigured: isConfigured,
          testEventCode: capi?.testEventCode || "",
        },
      },
    },
  };
};

const getAdminSettings = async (): Promise<IAdminSettingsResponse> => {
  const settings = await Settings.getSettings();
  return formatAdminSettings(settings.toObject());
};

const getPublicSettings = async (): Promise<IPublicSettings> => {
  const settings = await Settings.getSettings();
  const obj = settings.toObject();

  return {
    seo: {
      siteName: obj.seo?.siteName || "Enviroshield",
      defaultTitle: obj.seo?.defaultTitle || "Enviroshield",
      defaultDescription: obj.seo?.defaultDescription || "",
      defaultOgImage: obj.seo?.defaultOgImage || "/images/logo.png",
      googleVerificationToken: obj.seo?.googleVerificationToken || "",
      bingVerificationToken: obj.seo?.bingVerificationToken || "",
      defaultRobots: {
        index: obj.seo?.defaultRobots?.index ?? true,
        follow: obj.seo?.defaultRobots?.follow ?? true,
      },
    },
    analytics: {
      ga4: {
        enabled: Boolean(obj.analytics?.ga4?.enabled),
        measurementId: obj.analytics?.ga4?.measurementId || "",
        label: obj.analytics?.ga4?.label || "",
      },
      gtm: {
        enabled: Boolean(obj.analytics?.gtm?.enabled),
        containerId: obj.analytics?.gtm?.containerId || "",
      },
    },
    marketing: {
      metaPixel: {
        enabled: Boolean(obj.marketing?.metaPixel?.enabled),
        pixelId: obj.marketing?.metaPixel?.pixelId || "",
      },
      googleAds: {
        enabled: Boolean(obj.marketing?.googleAds?.enabled),
        conversionId: obj.marketing?.googleAds?.conversionId || "",
        conversionLabels: {
          contactForm: obj.marketing?.googleAds?.conversionLabels?.contactForm || "",
          quoteRequest: obj.marketing?.googleAds?.conversionLabels?.quoteRequest || "",
          consultationRequest:
            obj.marketing?.googleAds?.conversionLabels?.consultationRequest || "",
          phoneClick: obj.marketing?.googleAds?.conversionLabels?.phoneClick || "",
          emailClick: obj.marketing?.googleAds?.conversionLabels?.emailClick || "",
          whatsappClick:
            obj.marketing?.googleAds?.conversionLabels?.whatsappClick || "",
        },
      },
    },
    consent: {
      enabled: obj.consent?.enabled ?? true,
      requireAnalyticsConsent: obj.consent?.requireAnalyticsConsent ?? true,
      requireMarketingConsent: obj.consent?.requireMarketingConsent ?? true,
      bannerTitle:
        obj.consent?.bannerTitle || "Cookie & Tracking Preferences",
      bannerDescription:
        obj.consent?.bannerDescription ||
        "We use cookies and tracking technologies to enhance your experience, analyze site usage, and support our marketing efforts.",
    },
  };
};

const updateSettings = async (
  payload: IUpdateSettingsPayload,
): Promise<IAdminSettingsResponse> => {
  const current = await Settings.getSettings();

  if (payload.seo) {
    current.seo = {
      ...current.seo,
      ...payload.seo,
      defaultRobots: {
        ...current.seo.defaultRobots,
        ...(payload.seo.defaultRobots || {}),
      },
    };
  }

  if (payload.analytics) {
    if (payload.analytics.ga4) {
      current.analytics.ga4 = {
        ...current.analytics.ga4,
        ...payload.analytics.ga4,
      };
    }
    if (payload.analytics.gtm) {
      current.analytics.gtm = {
        ...current.analytics.gtm,
        ...payload.analytics.gtm,
      };
    }
  }

  if (payload.marketing) {
    if (payload.marketing.metaPixel) {
      const incomingPixel = payload.marketing.metaPixel;
      const currentPixel = current.marketing.metaPixel || {
        enabled: false,
        pixelId: "",
        capi: { enabled: false, accessToken: "", testEventCode: "" },
      };

      const currentCapi = currentPixel.capi || {
        enabled: false,
        accessToken: "",
        testEventCode: "",
      };

      let updatedAccessToken = currentCapi.accessToken || "";

      if (incomingPixel.capi) {
        if (incomingPixel.capi.clearAccessToken === true) {
          updatedAccessToken = "";
        } else if (
          typeof incomingPixel.capi.accessToken === "string" &&
          incomingPixel.capi.accessToken.trim().length > 0
        ) {
          // New token provided: encrypt before saving
          updatedAccessToken = encrypt(incomingPixel.capi.accessToken.trim());
        }
        // If neither clearAccessToken nor a new accessToken string is provided,
        // updatedAccessToken remains the existing currentCapi.accessToken.
      }

      current.marketing.metaPixel = {
        enabled:
          incomingPixel.enabled !== undefined
            ? incomingPixel.enabled
            : currentPixel.enabled,
        pixelId:
          incomingPixel.pixelId !== undefined
            ? incomingPixel.pixelId
            : currentPixel.pixelId,
        capi: {
          enabled:
            incomingPixel.capi?.enabled !== undefined
              ? incomingPixel.capi.enabled
              : currentCapi.enabled,
          accessToken: updatedAccessToken,
          testEventCode:
            incomingPixel.capi?.testEventCode !== undefined
              ? incomingPixel.capi.testEventCode
              : (currentCapi.testEventCode || ""),
        },
      };
    }

    if (payload.marketing.googleAds) {
      current.marketing.googleAds = {
        ...current.marketing.googleAds,
        ...payload.marketing.googleAds,
        conversionLabels: {
          ...current.marketing.googleAds.conversionLabels,
          ...(payload.marketing.googleAds.conversionLabels || {}),
        },
      };
    }
  }

  if (payload.consent) {
    current.consent = {
      ...current.consent,
      ...payload.consent,
    };
  }

  await current.save();
  return formatAdminSettings(current.toObject());
};

export const settingsService = {
  getAdminSettings,
  getPublicSettings,
  updateSettings,
};
