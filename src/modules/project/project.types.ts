import { Types } from "mongoose";

export type TProjectStatus = "draft" | "published";

export type TProjectImage = {
  url: string;
  alt: string;
  caption?: string;
};

export type TProjectLocation = {
  city: string;
  area?: string;
  country: string;
};

export type TProjectClient = {
  name: string;
  description?: string;
  logo?: {
    url: string;
    alt: string;
  };
};

export type TProjectSEO = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
};

export type TProject = {
  title: string;
  slug: string;

  primaryImage: TProjectImage;

  description: string;

  location: TProjectLocation;

  completionDate: Date;

  gallery: TProjectImage[];

  client: TProjectClient;

  serviceId: Types.ObjectId;

  status: TProjectStatus;

  isFeatured: boolean;

  seo?: TProjectSEO;
};
