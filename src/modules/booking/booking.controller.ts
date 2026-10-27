import { Response } from "express";
import httpStatus from "http-status";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { bookingService } from "./booking.service";

const createBooking = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const booking = await bookingService.createBooking(
      req.user!.id,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  },
);

const getMyBookings = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await bookingService.getMyBookings(req.user!.id, req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Your bookings retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getAllBookings = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await bookingService.getAllBookings(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Bookings retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getMyBookingById = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const booking = await bookingService.getMyBookingById(
      req.user!.id,
      req.params.id as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Your booking retrieved successfully",
      data: booking,
    });
  },
);

const getBookingById = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const booking = await bookingService.getBookingById(req.params.id as string);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Booking retrieved successfully",
      data: booking,
    });
  },
);

const updateBookingPrice = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const booking = await bookingService.updateBookingPrice(
      req.params.id as string,
      req.body.finalPrice,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Booking price updated successfully",
      data: booking,
    });
  },
);

const updateBookingStatus = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const booking = await bookingService.updateBookingStatus(
      req.params.id as string,
      req.body.status,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Booking status updated successfully",
      data: booking,
    });
  },
);

const updateBookingManagement = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const booking = await bookingService.updateBookingManagement(
      req.params.id as string,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Booking details updated successfully",
      data: booking,
    });
  },
);

const cancelMyBooking = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const booking = await bookingService.cancelBooking(
      req.params.id as string,
      { id: req.user!.id, role: "user" },
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  },
);

const cancelBookingAdmin = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const booking = await bookingService.cancelBooking(
      req.params.id as string,
      { id: req.user!.id, role: "admin" },
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  },
);

export const bookingController = {
  createBooking,
  getMyBookings,
  getAllBookings,
  getMyBookingById,
  getBookingById,
  updateBookingPrice,
  updateBookingStatus,
  updateBookingManagement,
  cancelMyBooking,
  cancelBookingAdmin,
};
