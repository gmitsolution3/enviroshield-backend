
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { orderController } from "./order.controller";
import { orderValidation } from "./order.validation";

const router = Router();

// Customer routes
router.get(
  "/mine",
  authenticate,
  authorize("user"),
  validateRequest(orderValidation.getOrdersQuerySchema),
  orderController.getMyOrders,
);

router.get(
  "/mine/:id",
  authenticate,
  authorize("user"),
  validateRequest(orderValidation.orderIdParamsSchema),
  orderController.getMyOrderById,
);

router.patch(
  "/mine/:id/cancel",
  authenticate,
  authorize("user"),
  validateRequest(orderValidation.cancelOrderValidationSchema),
  orderController.cancelMyOrder,
);


// Admin routes
router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(orderValidation.getOrdersQuerySchema),
  orderController.getAllOrders,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(orderValidation.orderIdParamsSchema),
  orderController.getOrderById,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("admin"),
  validateRequest(orderValidation.updateOrderStatusValidationSchema),
  orderController.updateOrderStatus,
);

router.patch(
  "/:id/payment-status",
  authenticate,
  authorize("admin"),
  validateRequest(orderValidation.updatePaymentStatusValidationSchema),
  orderController.updatePaymentStatus,
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorize("admin"),
  validateRequest(orderValidation.cancelOrderValidationSchema),
  orderController.cancelOrderAdmin,
);


// Create an order
router.post(
  "/",
  authenticate,
  validateRequest(orderValidation.createOrderValidationSchema),
  orderController.createOrder,
);

export default router;
