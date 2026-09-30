import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { blogService } from "./blog.service";

const createBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await blogService.createBlog({
    ...req.body,
    authorId: req.user!.id,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Blog created successfully",
    data: result,
  });
});

const getAllBlogs = catchAsync(
  async (req: Request, res: Response) => {
    const result = await blogService.getAllBlogs({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Blogs retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getPublishedBlogs = catchAsync(
  async (req: Request, res: Response) => {
    const result = await blogService.getPublishedBlogs({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Published blogs retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getBlogById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await blogService.getBlogById(req.params.id as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Blog retrieved successfully",
      data: result,
    });
  },
);

const getPublishedBlogBySlug = catchAsync(
  async (req: Request, res: Response) => {
    const result = await blogService.getPublishedBlogBySlug(
      req.params.slug as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Blog retrieved successfully",
      data: result,
    });
  },
);

const updateBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await blogService.updateBlog(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog updated successfully",
    data: result,
  });
});

const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  await blogService.deleteBlog(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog deleted successfully",
    data: null,
  });
});

export const blogController = {
  createBlog,
  getAllBlogs,
  getPublishedBlogs,
  getBlogById,
  getPublishedBlogBySlug,
  updateBlog,
  deleteBlog,
};
