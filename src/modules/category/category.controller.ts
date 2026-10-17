import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { categoryService } from "./category.service";

const createCategory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await categoryService.createCategory(req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Category created successfully",
      data: result,
    });
  },
);

const getAllCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result = await categoryService.getAllCategories({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Categories retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getCategoryById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await categoryService.getCategoryById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category retrieved successfully",
      data: result,
    });
  },
);

const getCategoryBySlug = catchAsync(
  async (req: Request, res: Response) => {
    const result = await categoryService.getCategoryBySlug(
      req.params.slug as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category retrieved successfully",
      data: result,
    });
  },
);

const updateCategory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await categoryService.updateCategory(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category updated successfully",
      data: result,
    });
  },
);

const deleteCategory = catchAsync(
  async (req: Request, res: Response) => {
    await categoryService.deleteCategory(req.params.id as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category deleted successfully",
      data: null,
    });
  },
);

export const categoryController = {
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
};