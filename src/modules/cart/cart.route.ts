
import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { cartController } from "./cart.controller";
import { cartValidation } from "./cart.validation";

const router = Router();

router.post(
  "/calculate",
  validateRequest(cartValidation.calculateCartValidationSchema),
  cartController.calculateCart,
);

export default router;
