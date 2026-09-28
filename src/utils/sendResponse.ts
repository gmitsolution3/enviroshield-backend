import { Response } from "express";
import { TResponse } from "../types/common";

export const sendResponse = <T>(
  res: Response,
  payload: TResponse<T>,
) => {
  res.status(payload.statusCode).json({
    success: payload.success,
    statusCode: payload.statusCode,
    message: payload.message,
    meta: payload.meta,
    data: payload.data,
  });
};
