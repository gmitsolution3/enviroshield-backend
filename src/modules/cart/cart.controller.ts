
import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { cartService } from "./cart.service";

const calculateCart = catchAsync(
  async (req: Request, res: Response) => {
    const result = await cartService.calculateCart(req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Cart calculated successfully",
      data: result,
    });
  },
);

export const cartController = {
  calculateCart,
};
