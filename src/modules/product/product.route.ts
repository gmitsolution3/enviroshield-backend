import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { productController } from "./product.controller";
import { productValidation } from "./product.validation";

const router = Router();

// Public routes

router.get(
  "/published",
  validateRequest(productValidation.productQuerySchema),
  productController.getPublishedProducts,
);

router.get(
  "/slug/:slug",
  validateRequest(productValidation.productSlugParamsSchema),
  productController.getPublishedProductBySlug,
);

// Admin routes

router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(productValidation.productQuerySchema),
  productController.getAllProducts,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(productValidation.productIdParamsSchema),
  productController.getProductById,
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(productValidation.createProductValidationSchema),
  productController.createProduct,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(productValidation.updateProductValidationSchema),
  productController.updateProduct,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(productValidation.productIdParamsSchema),
  productController.deleteProduct,
);

export default router;