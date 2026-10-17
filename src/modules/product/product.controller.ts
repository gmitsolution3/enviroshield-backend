import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { productService } from "./product.service";

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.createProduct(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Product created successfully",
    data: result,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.getAllProducts({
    page: req.query.page as string,
    limit: req.query.limit as string,
    search: req.query.search as string,
    categoryId: req.query.categoryId as string,
    status: req.query.status as "draft" | "published",
    isFeatured: req.query.isFeatured as string,
    minPrice: req.query.minPrice as string,
    maxPrice: req.query.maxPrice as string,
    inStock: req.query.inStock as string,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as "asc" | "desc",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Products retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getPublishedProducts = catchAsync(
  async (req: Request, res: Response) => {
    const result = await productService.getPublishedProducts({
      page: req.query.page as string,
      limit: req.query.limit as string,
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      isFeatured: req.query.isFeatured as string,
      minPrice: req.query.minPrice as string,
      maxPrice: req.query.maxPrice as string,
      inStock: req.query.inStock as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Published products retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getProductById = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.getProductById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product retrieved successfully",
    data: result,
  });
});

const getPublishedProductBySlug = catchAsync(
  async (req: Request, res: Response) => {
    const result = await productService.getPublishedProductBySlug(
      req.params.slug as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Published product retrieved successfully",
      data: result,
    });
  },
);

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.updateProduct(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product updated successfully",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product deleted successfully",
    data: null,
  });
});

export const productController = {
  createProduct,
  getAllProducts,
  getPublishedProducts,
  getProductById,
  getPublishedProductBySlug,
  updateProduct,
  deleteProduct,
};