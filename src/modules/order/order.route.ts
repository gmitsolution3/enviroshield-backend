
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

// Create an order
router.post(
  "/",
  authenticate,
  validateRequest(orderValidation.createOrderValidationSchema),
  orderController.createOrder,
);

export default router;
