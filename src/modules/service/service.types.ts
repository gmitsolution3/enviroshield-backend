
import { Types } from "mongoose";

export type TServiceStatus = "draft" | "published";

export type TServiceImage = {
  url: string;
  publicId: string;
  alt: string;
  caption?: string;
};

export type TServiceItem = {
  title: string;
  description: string;
};

export type TServiceSection = {
  image: TServiceImage;
  items: TServiceItem[];
};

export type TServiceSEO = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImagePublicId?: string;
  noIndex?: boolean;
};

export type TService = {
  name: string;
  slug: string;
  price: number;

  isFeatured: boolean;

  primaryImage: TServiceImage;

  detailHeading: string;
  description: string;

  whyEnviroshield: TServiceSection;
  process: TServiceSection;
  benefits: TServiceSection;

  projects: Types.ObjectId[];

  status: TServiceStatus;
  publishedAt?: Date | null;

  seo?: TServiceSEO;
};
