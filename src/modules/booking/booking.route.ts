import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { validateRequest } from "../../middlewares/validateRequest";
import { bookingController } from "./booking.controller";
import { bookingValidation } from "./booking.validation";

const router = Router();

// Customer routes
router.get(
  "/mine",
  authenticate,
  authorize("user"),
  validateRequest(bookingValidation.bookingQuerySchema),
  bookingController.getMyBookings,
);

router.get(
  "/mine/:id",
  authenticate,
  authorize("user"),
  validateRequest(bookingValidation.bookingIdParamsSchema),
  bookingController.getMyBookingById,
);

router.patch(
  "/mine/:id/cancel",
  authenticate,
  authorize("user"),
  validateRequest(bookingValidation.cancelBookingValidationSchema),
  bookingController.cancelMyBooking,
);

router.post(
  "/",
  authenticate,
  authorize("user"),
  validateRequest(bookingValidation.createBookingValidationSchema),
  bookingController.createBooking,
);

// Admin routes
router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest(bookingValidation.bookingQuerySchema),
  bookingController.getAllBookings,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest(bookingValidation.bookingIdParamsSchema),
  bookingController.getBookingById,
);

router.patch(
  "/:id/price",
  authenticate,
  authorize("admin"),
  validateRequest(bookingValidation.updateBookingPriceValidationSchema),
  bookingController.updateBookingPrice,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("admin"),
  validateRequest(bookingValidation.updateBookingStatusValidationSchema),
  bookingController.updateBookingStatus,
);

router.patch(
  "/:id/management",
  authenticate,
  authorize("admin"),
  validateRequest(bookingValidation.updateBookingManagementValidationSchema),
  bookingController.updateBookingManagement,
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorize("admin"),
  validateRequest(bookingValidation.cancelBookingValidationSchema),
  bookingController.cancelBookingAdmin,
);

export default router;
