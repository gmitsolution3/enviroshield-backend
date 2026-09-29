import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { projectController } from "./project.controller";
import { projectValidation } from "./project.validation";

const router = Router();

// Public routes
router.get(
  "/published",
  validateRequest(projectValidation.projectQuerySchema),
  projectController.getPublishedProjects,
);

router.get(
  "/featured",
  projectController.getFeaturedProjects,
);

router.get(
  "/service/:serviceId",
  validateRequest(projectValidation.projectServiceParamsSchema),
  validateRequest(projectValidation.projectQuerySchema),
  projectController.getProjectsByService,
);

router.get(
  "/slug/:slug",
  validateRequest(projectValidation.projectSlugParamsSchema),
  projectController.getPublishedProjectBySlug,
);

// Admin routes
router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(projectValidation.projectQuerySchema),
  projectController.getAllProjects,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(projectValidation.projectIdParamsSchema),
  projectController.getProjectById,
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(projectValidation.createProjectValidationSchema),
  projectController.createProject,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(projectValidation.updateProjectValidationSchema),
  projectController.updateProject,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(projectValidation.projectIdParamsSchema),
  projectController.deleteProject,
);

export default router;