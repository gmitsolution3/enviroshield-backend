
import httpStatus from "http-status";
import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { orderService } from "./order.service";

const createOrder = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const order = await orderService.createOrder(
      {
        id: req.user.id,
        email: req.user.email,
      },
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Order created successfully",
      data: order,
    });
  },
);


const getMyOrders = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const result = await orderService.getMyOrders(req.user.id, {
      page: req.query.page as string,
      limit: req.query.limit as string,
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string,
      orderNumber: req.query.orderNumber as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Your orders retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getAllOrders = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await orderService.getAllOrders({
      page: req.query.page as string,
      limit: req.query.limit as string,
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string,
      orderNumber: req.query.orderNumber as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Orders retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getMyOrderById = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const order = await orderService.getMyOrderById(
      req.user.id,
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Your order retrieved successfully",
      data: order,
    });
  },
);

const getOrderById = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const order = await orderService.getOrderById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Order retrieved successfully",
      data: order,
    });
  },
);

const updateOrderStatus = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const order = await orderService.updateOrderStatus(
      req.params.id as string,
      req.body.status,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  },
);

const updatePaymentStatus = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const order = await orderService.updatePaymentStatus(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment status updated successfully",
      data: order,
    });
  },
);


const cancelMyOrder = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const order = await orderService.cancelOrder(
      req.params.id as string,
      { id: req.user.id, role: "user" },
      req.body.reason,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  },
);

const cancelOrderAdmin = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const order = await orderService.cancelOrder(
      req.params.id as string,
      { id: req.user.id, role: "admin" },
      req.body.reason,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  },
);

export const orderController = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getMyOrderById,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  cancelMyOrder,
  cancelOrderAdmin,
};