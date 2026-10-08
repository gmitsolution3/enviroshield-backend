import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { contactController } from "./contact.controller";
import {
  contactIdValidationSchema,
  contactQueryValidationSchema,
  createContactValidationSchema,
  updateContactValidationSchema,
} from "./contact.validation";

const router = Router();

// Public — website lead submission
router.post(
  "/",
  validateRequest(createContactValidationSchema),
  contactController.createContact,
);

// Admin — contact management
router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(contactQueryValidationSchema),
  contactController.getAllContacts,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(contactIdValidationSchema),
  contactController.getContactById,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(contactIdValidationSchema),
  validateRequest(updateContactValidationSchema),
  contactController.updateContact,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(contactIdValidationSchema),
  contactController.deleteContact,
);

export default router;
