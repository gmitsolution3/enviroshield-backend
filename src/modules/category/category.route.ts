import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { categoryController } from "./category.controller";
import { categoryValidation } from "./category.validation";

const router = Router();

// Public routes

router.get(
  "/",
  validateRequest(categoryValidation.categoryQuerySchema),
  categoryController.getAllCategories,
);

router.get(
  "/slug/:slug",
  validateRequest(categoryValidation.categorySlugParamsSchema),
  categoryController.getCategoryBySlug,
);

// Admin routes

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(categoryValidation.categoryIdParamsSchema),
  categoryController.getCategoryById,
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(categoryValidation.createCategoryValidationSchema),
  categoryController.createCategory,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(categoryValidation.updateCategoryValidationSchema),
  categoryController.updateCategory,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(categoryValidation.categoryIdParamsSchema),
  categoryController.deleteCategory,
);

export default router;