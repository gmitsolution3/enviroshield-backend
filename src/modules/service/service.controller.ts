import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { serviceService } from "./service.service";

const createService = catchAsync(
  async (req: Request, res: Response) => {
    const result = await serviceService.createService(req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Service created successfully",
      data: result,
    });
  },
);

const getAllServices = catchAsync(
  async (req: Request, res: Response) => {
    const result = await serviceService.getAllServices({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Services retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getPublishedServices = catchAsync(
  async (req: Request, res: Response) => {
    const result = await serviceService.getPublishedServices({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Published services retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getFeaturedServices = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await serviceService.getFeaturedServices();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Featured services retrieved successfully",
      data: result,
    });
  },
);

const getServiceById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await serviceService.getServiceById(req.params.id as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service retrieved successfully",
      data: result,
    });
  },
);

const getPublishedServiceBySlug = catchAsync(
  async (req: Request, res: Response) => {
    const result = await serviceService.getPublishedServiceBySlug(
      req.params.slug as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service retrieved successfully",
      data: result,
    });
  },
);

const updateService = catchAsync(
  async (req: Request, res: Response) => {
    const result = await serviceService.updateService(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service updated successfully",
      data: result,
    });
  },
);

const deleteService = catchAsync(
  async (req: Request, res: Response) => {
    await serviceService.deleteService(req.params.id as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service deleted successfully",
      data: null,
    });
  },
);

export const serviceController = {
  createService,
  getAllServices,
  getPublishedServices,
  getFeaturedServices,
  getServiceById,
  getPublishedServiceBySlug,
  updateService,
  deleteService,
};
