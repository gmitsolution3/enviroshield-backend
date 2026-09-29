import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { testimonialController } from "./testimonial.controller";
import { testimonialValidation } from "./testimonial.validation";

const router = Router();

// Public routes
router.get(
  "/published",
  validateRequest(testimonialValidation.testimonialQuerySchema),
  testimonialController.getPublishedTestimonials,
);

// Admin routes
router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(testimonialValidation.testimonialQuerySchema),
  testimonialController.getAllTestimonials,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(testimonialValidation.testimonialIdParamsSchema),
  testimonialController.getTestimonialById,
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(
    testimonialValidation.createTestimonialValidationSchema,
  ),
  testimonialController.createTestimonial,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(
    testimonialValidation.updateTestimonialValidationSchema,
  ),
  testimonialController.updateTestimonial,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(testimonialValidation.testimonialIdParamsSchema),
  testimonialController.deleteTestimonial,
);

export default router;
