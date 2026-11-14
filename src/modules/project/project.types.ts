
import { Types } from "mongoose";

export type TProjectStatus = "draft" | "published";

export type TProjectImage = {
  url: string;
  publicId: string;
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
    publicId: string;
    alt: string;
  };
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
};
