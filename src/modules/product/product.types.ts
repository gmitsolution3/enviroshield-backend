
import { Types } from "mongoose";

export type TProductStatus = "draft" | "published";

export type TProductImage = {
  url: string;
  publicId: string;
  alt: string;
};

export type TProductSEO = {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImagePublicId: string;
  noIndex: boolean;
};

export type TProduct = {
  name: string;
  slug: string;
  sku: string;
  categoryId: Types.ObjectId;

  shortDescription: string;
  description: Record<string, unknown>;

  primaryImage: TProductImage;
  gallery: TProductImage[];

  price: number;
  costPrice: number;

  weight: number;
  tdsUrl: string;
  tdsPublicId: string;

  stockQuantity: number;
  lowStockThreshold: number;

  status: TProductStatus;
  isFeatured: boolean;
  publishedAt: Date | null;

  seo: TProductSEO;
};
