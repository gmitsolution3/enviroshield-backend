import { Types } from "mongoose";

export type TContactStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "site-visit"
  | "proposal-sent"
  | "won"
  | "lost";

export type TContactSource =
  | "website"
  | "phone"
  | "referral"
  | "other";

export type TContactProjectType =
  | "residential"
  | "commercial"
  | "industrial"
  | "warehouse"
  | "factory"
  | "hospital"
  | "school"
  | "hotel"
  | "office"
  | "shopping-mall"
  | "sports-facility"
  | "other";

export type TContactProjectTimeline =
  | "immediate"
  | "within-1-month"
  | "1-3-months"
  | "3-6-months"
  | "6-plus-months"
  | "not-decided";

export type TContactAreaUnit = "sqft" | "sqm";

export type TContactProjectLocation = {
  address?: string;
  area?: string;
  city: string;
  country: string;
};

export type TContact = {
  // Customer information
  fullName: string;
  phoneNumber: string;
  email: string;
  companyName?: string;
  jobTitle?: string;

  // Service requirement
  serviceId?: Types.ObjectId;

  // Project information
  projectName?: string;
  projectType?: TContactProjectType;
  projectLocation?: TContactProjectLocation;
  projectAreaSize?: number;
  projectAreaUnit?: TContactAreaUnit;

  // Project requirements
  siteVisitRequired?: boolean;
  projectTimeline?: TContactProjectTimeline;
  message?: string;

  // Lead management
  status: TContactStatus;
  source: TContactSource;
  adminNotes?: string;
};