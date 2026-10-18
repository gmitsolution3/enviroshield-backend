
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

export const orderController = {
  createOrder,
};
