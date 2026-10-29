import { Response } from "express";
import httpStatus from "http-status";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { analyticsService } from "./analytics.service";

const getAdminOverview = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const period = req.query.period as string | undefined;
    const data = await analyticsService.getAdminOverview(period);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin overview analytics retrieved successfully",
      data,
    });
  },
);

const getAdminSales = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const period = req.query.period as string | undefined;
    const data = await analyticsService.getAdminSales(period);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin sales analytics retrieved successfully",
      data,
    });
  },
);

const getAdminOrders = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const period = req.query.period as string | undefined;
    const data = await analyticsService.getAdminOrders(period);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin order analytics retrieved successfully",
      data,
    });
  },
);

const getAdminBookings = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const period = req.query.period as string | undefined;
    const data = await analyticsService.getAdminBookings(period);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin booking analytics retrieved successfully",
      data,
    });
  },
);

const getAdminProducts = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const period = req.query.period as string | undefined;
    const data = await analyticsService.getAdminProducts(period);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin product analytics retrieved successfully",
      data,
    });
  },
);

const getUserOverview = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const period = req.query.period as string | undefined;
    const data = await analyticsService.getUserOverview(req.user.id, period);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User overview analytics retrieved successfully",
      data,
    });
  },
);

const getUserActivity = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const period = req.query.period as string | undefined;
    const data = await analyticsService.getUserActivity(req.user.id, period);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User activity retrieved successfully",
      data,
    });
  },
);

export const analyticsController = {
  getAdminOverview,
  getAdminSales,
  getAdminOrders,
  getAdminBookings,
  getAdminProducts,
  getUserOverview,
  getUserActivity,
};

