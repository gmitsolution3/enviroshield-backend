import { Types } from "mongoose";
import { TNotificationEntityType, TNotificationType } from "./notification.constant";

export type TNotification = {
  _id?: Types.ObjectId;
  recipient: string; // User ID from Better Auth
  type: TNotificationType;
  title: string;
  message: string;
  entityType?: TNotificationEntityType;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TCreateNotificationPayload = {
  recipient: string;
  type: TNotificationType;
  title: string;
  message: string;
  entityType?: TNotificationEntityType;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
};

export type TNotificationQuery = {
  page?: string;
  limit?: string;
  unreadOnly?: string | boolean;
};
