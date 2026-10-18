
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { orderController } from "./order.controller";
import { orderValidation } from "./order.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  validateRequest(orderValidation.createOrderValidationSchema),
  orderController.createOrder,
);

export default router;
