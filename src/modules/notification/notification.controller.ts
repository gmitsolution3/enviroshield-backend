import { Response } from "express";
import httpStatus from "http-status";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { notificationService } from "./notification.service";

const getNotifications = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const result = await notificationService.getNotifications(
      userId,
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Notifications retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getUnreadCount = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const result = await notificationService.getUnreadCount(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Unread count retrieved successfully",
      data: result,
    });
  },
);

const markAsRead = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const result = await notificationService.markAsRead(
      req.params.id as string,
      userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Notification marked as read",
      data: result,
    });
  },
);

const markAllAsRead = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const result = await notificationService.markAllAsRead(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "All notifications marked as read",
      data: result,
    });
  },
);

const deleteNotification = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const result = await notificationService.deleteNotification(
      req.params.id as string,
      userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Notification deleted successfully",
      data: result,
    });
  },
);

export const notificationController = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

