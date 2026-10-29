import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { settingsService } from "./settings.service";

const getPublicSettings = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await settingsService.getPublicSettings();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Public settings retrieved successfully",
      data: result,
    });
  },
);

const getAdminSettings = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await settingsService.getAdminSettings();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin settings retrieved successfully",
      data: result,
    });
  },
);

const updateSettings = catchAsync(
  async (req: Request, res: Response) => {
    const result = await settingsService.updateSettings(req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Settings updated successfully",
      data: result,
    });
  },
);

export const settingsController = {
  getPublicSettings,
  getAdminSettings,
  updateSettings,
};

