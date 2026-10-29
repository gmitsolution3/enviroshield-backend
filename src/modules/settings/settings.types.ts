export interface ISeoSettings {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultOgImage: string;
  googleVerificationToken: string;
  bingVerificationToken: string;
  defaultRobots: {
    index: boolean;
    follow: boolean;
  };
}

export interface IGa4Settings {
  enabled: boolean;
  measurementId: string;
  label?: string;
}

export interface IGtmSettings {
  enabled: boolean;
  containerId: string;
}

export interface IAnalyticsSettings {
  ga4: IGa4Settings;
  gtm: IGtmSettings;
}

export interface IMetaPixelSettings {
  enabled: boolean;
  pixelId: string;
}

export interface IGoogleAdsConversionLabels {
  contactForm?: string;
  quoteRequest?: string;
  consultationRequest?: string;
  phoneClick?: string;
  emailClick?: string;
  whatsappClick?: string;
}

export interface IGoogleAdsSettings {
  enabled: boolean;
  conversionId: string;
  conversionLabels: IGoogleAdsConversionLabels;
}

export interface IMarketingSettings {
  metaPixel: IMetaPixelSettings;
  googleAds: IGoogleAdsSettings;
}

export interface IConsentSettings {
  enabled: boolean;
  requireAnalyticsConsent: boolean;
  requireMarketingConsent: boolean;
  bannerTitle: string;
  bannerDescription: string;
}

export interface ISettings {
  seo: ISeoSettings;
  analytics: IAnalyticsSettings;
  marketing: IMarketingSettings;
  consent: IConsentSettings;
}

export type IPublicSettings = ISettings;
