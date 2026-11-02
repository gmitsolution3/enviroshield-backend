import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { notificationController } from "./notification.controller";
import { notificationValidation } from "./notification.validation";

const router = Router();

router.get(
  "/unread-count",
  authenticate as any,
  notificationController.getUnreadCount as any,
);

router.patch(
  "/read-all",
  authenticate as any,
  notificationController.markAllAsRead as any,
);

router.get(
  "/",
  authenticate as any,
  validateRequest(notificationValidation.notificationQuerySchema),
  notificationController.getNotifications as any,
);

router.patch(
  "/:id/read",
  authenticate as any,
  validateRequest(notificationValidation.notificationIdParamsSchema),
  notificationController.markAsRead as any,
);

router.delete(
  "/:id",
  authenticate as any,
  validateRequest(notificationValidation.notificationIdParamsSchema),
  notificationController.deleteNotification as any,
);

export default router;
