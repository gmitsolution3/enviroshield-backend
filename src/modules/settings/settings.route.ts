import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { settingsController } from "./settings.controller";
import { updateSettingsValidationSchema } from "./settings.validation";

const router = Router();

// Public website integration endpoint
router.get("/public", settingsController.getPublicSettings);

// Admin dashboard endpoints
router.get("/", authenticate, authorize("admin"), settingsController.getAdminSettings);

router.patch(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(updateSettingsValidationSchema),
  settingsController.updateSettings,
);

export default router;

