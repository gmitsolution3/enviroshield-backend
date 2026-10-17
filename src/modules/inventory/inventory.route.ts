
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { inventoryController } from "./inventory.controller";
import { inventoryValidation } from "./inventory.validation";

const router = Router();

router.post(
  "/:productId/adjust",
  authenticate,
  authorize("admin"),
  validateRequest(inventoryValidation.adjustStockValidationSchema),
  inventoryController.adjustStock,
);


router.get(
  "/:productId/movements",
  authenticate,
  authorize("admin"),
  validateRequest(
    inventoryValidation.getMovementHistoryValidationSchema,
  ),
  inventoryController.getMovementHistory,
);

router.get(
  "/low-stock",
  authenticate,
  authorize("admin"),
  validateRequest(
    inventoryValidation.getLowStockProductsValidationSchema,
  ),
  inventoryController.getLowStockProducts,
);

export default router;
