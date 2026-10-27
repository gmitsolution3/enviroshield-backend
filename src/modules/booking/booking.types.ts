import { Types } from "mongoose";
import { BOOKING_STATUS } from "./booking.constant";

export type TBookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export type TBookingProject = {
  location: string;
  areaSize?: number;
  areaUnit?: string;
  message?: string;
};

export type TBooking = {
  bookingNumber: string;
  // Better Auth user IDs are strings; this matches the existing Order model.
  userId: string;
  serviceId: Types.ObjectId;
  project: TBookingProject;
  isSiteVisit: boolean;
  siteVisitDate?: Date;
  finalPrice: number;
  status: TBookingStatus;
  adminNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TCreateBookingPayload = {
  serviceId: string;
  project: TBookingProject;
  isSiteVisit?: boolean;
};

export type TBookingQuery = {
  page?: string;
  limit?: string;
  status?: TBookingStatus;
  bookingNumber?: string;
};
