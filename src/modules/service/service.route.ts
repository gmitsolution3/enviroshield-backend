import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { serviceController } from "./service.controller";
import { serviceValidation } from "./service.validation";

const router = Router();

// Public routes

router.get(
  "/published",
  validateRequest(serviceValidation.serviceQuerySchema),
  serviceController.getPublishedServices,
);

router.get("/featured", serviceController.getFeaturedServices);

router.get(
  "/slug/:slug",
  validateRequest(serviceValidation.serviceSlugParamsSchema),
  serviceController.getPublishedServiceBySlug,
);

// Admin routes

router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(serviceValidation.serviceQuerySchema),
  serviceController.getAllServices,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(serviceValidation.serviceIdParamsSchema),
  serviceController.getServiceById,
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(serviceValidation.createServiceValidationSchema),
  serviceController.createService,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(serviceValidation.updateServiceValidationSchema),
  serviceController.updateService,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(serviceValidation.serviceIdParamsSchema),
  serviceController.deleteService,
);

export default router;
