import httpStatus from "http-status";
import mongoose, { Types } from "mongoose";
import { client } from "../../config/mongodb";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import Notification from "./notification.model";
import {
  TCreateNotificationPayload,
  TNotification,
  TNotificationQuery,
} from "./notification.types";

const getAdminUsers = async (): Promise<{ id: string; email?: string }[]> => {
  try {
    const collection =
      mongoose.connection.readyState === 1 && mongoose.connection.db
        ? mongoose.connection.collection("user")
        : client.db(process.env.MONGODB_DB).collection("user");

    const admins = await collection
      .find(
        { role: "admin", banned: { $ne: true } },
        { projection: { id: 1, _id: 1, email: 1 } },
      )
      .toArray();

    return admins.map((adm) => ({
      id: String(adm.id || adm._id),
      email: adm.email,
    }));
  } catch (error) {
    console.error("Failed to query admin users:", error);
    return [];
  }
};

const createNotification = async (
  payload: TCreateNotificationPayload,
): Promise<TNotification> => {
  const idempotencyKey =
    payload.idempotencyKey ||
    (payload.metadata?.idempotencyKey as string | undefined);

  if (idempotencyKey) {
    const existing = await Notification.findOne({
      recipient: payload.recipient,
      "metadata.idempotencyKey": idempotencyKey,
    });
    if (existing) {
      return existing;
    }
  }

  const notification = await Notification.create({
    recipient: payload.recipient,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    entityType: payload.entityType,
    entityId: payload.entityId,
    actionUrl: payload.actionUrl,
    metadata: {
      ...(payload.metadata || {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    },
    isRead: false,
    readAt: null,
  });

  return notification;
};

const notifyAdmins = async (
  payload: Omit<TCreateNotificationPayload, "recipient">,
): Promise<TNotification[]> => {
  const admins = await getAdminUsers();
  if (admins.length === 0) {
    return [];
  }

  const results: TNotification[] = [];
  for (const admin of admins) {
    try {
      const created = await createNotification({
        ...payload,
        recipient: admin.id,
      });
      results.push(created);
    } catch (err) {
      console.error(`Failed to create notification for admin ${admin.id}:`, err);
    }
  }

  return results;
};

const getNotifications = async (
  userId: string,
  query: TNotificationQuery,
) => {
  const { page, limit, skip } = calculatePagination(query);

  const filter: Record<string, unknown> = {
    recipient: userId,
  };

  if (query.unreadOnly === true || query.unreadOnly === "true") {
    filter.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
      unreadCount,
    },
    data: notifications,
  };
};

const getUnreadCount = async (userId: string) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });

  return { unreadCount: count };
};

const markAsRead = async (
  notificationId: string,
  userId: string,
): Promise<TNotification> => {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  if (notification.isRead) {
    return notification;
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

const markAllAsRead = async (userId: string) => {
  const result = await Notification.updateMany(
    {
      recipient: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
  );

  return {
    modifiedCount: result.modifiedCount,
  };
};

const deleteNotification = async (
  notificationId: string,
  userId: string,
) => {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  return {
    success: true,
    message: "Notification deleted successfully",
  };
};

export const notificationService = {
  createNotification,
  notifyAdmins,
  getAdminUsers,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
