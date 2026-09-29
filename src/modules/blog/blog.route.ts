import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { blogController } from "./blog.controller";
import { blogValidation } from "./blog.validation";

const router = Router();

// Public routes

router.get(
  "/published",
  validateRequest(blogValidation.blogQuerySchema),
  blogController.getPublishedBlogs,
);

router.get(
  "/slug/:slug",
  validateRequest(blogValidation.blogSlugParamsSchema),
  blogController.getPublishedBlogBySlug,
);

// Admin routes

router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(blogValidation.blogQuerySchema),
  blogController.getAllBlogs,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(blogValidation.blogIdParamsSchema),
  blogController.getBlogById,
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(blogValidation.createBlogValidationSchema),
  blogController.createBlog,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(blogValidation.updateBlogValidationSchema),
  blogController.updateBlog,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(blogValidation.blogIdParamsSchema),
  blogController.deleteBlog,
);

export default router;
