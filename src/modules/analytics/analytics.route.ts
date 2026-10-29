import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { analyticsController } from "./analytics.controller";
import { analyticsValidation } from "./analytics.validation";

const router = Router();

// Administrator Analytics APIs
router.get(
  "/admin/overview",
  authenticate,
  authorize("admin"),
  validateRequest(analyticsValidation.getAnalyticsQuerySchema),
  analyticsController.getAdminOverview,
);

router.get(
  "/admin/sales",
  authenticate,
  authorize("admin"),
  validateRequest(analyticsValidation.getAnalyticsQuerySchema),
  analyticsController.getAdminSales,
);

router.get(
  "/admin/orders",
  authenticate,
  authorize("admin"),
  validateRequest(analyticsValidation.getAnalyticsQuerySchema),
  analyticsController.getAdminOrders,
);

router.get(
  "/admin/bookings",
  authenticate,
  authorize("admin"),
  validateRequest(analyticsValidation.getAnalyticsQuerySchema),
  analyticsController.getAdminBookings,
);

router.get(
  "/admin/products",
  authenticate,
  authorize("admin"),
  validateRequest(analyticsValidation.getAnalyticsQuerySchema),
  analyticsController.getAdminProducts,
);

// Customer Analytics APIs
router.get(
  "/user/overview",
  authenticate,
  authorize("user"),
  validateRequest(analyticsValidation.getAnalyticsQuerySchema),
  analyticsController.getUserOverview,
);

router.get(
  "/user/activity",
  authenticate,
  authorize("user"),
  validateRequest(analyticsValidation.getAnalyticsQuerySchema),
  analyticsController.getUserActivity,
);

export default router;
