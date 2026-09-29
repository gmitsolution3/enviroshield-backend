import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { projectService } from "./project.service";

const createProject = catchAsync(
  async (req: Request, res: Response) => {
    const result = await projectService.createProject(req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Project created successfully",
      data: result,
    });
  },
);

const getAllProjects = catchAsync(
  async (req: Request, res: Response) => {
    const result = await projectService.getAllProjects({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Projects retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getPublishedProjects = catchAsync(
  async (req: Request, res: Response) => {
    const result = await projectService.getPublishedProjects({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Published projects retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getFeaturedProjects = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await projectService.getFeaturedProjects();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Featured projects retrieved successfully",
      data: result,
    });
  },
);

const getProjectsByService = catchAsync(
  async (req: Request, res: Response) => {
    const result = await projectService.getProjectsByService(
      req.params.serviceId as string,
      {
        page: req.query.page as string,
        limit: req.query.limit as string,
      },
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service projects retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getProjectById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await projectService.getProjectById(req.params.id as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Project retrieved successfully",
      data: result,
    });
  },
);

const getPublishedProjectBySlug = catchAsync(
  async (req: Request, res: Response) => {
    const result = await projectService.getPublishedProjectBySlug(
      req.params.slug as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Project retrieved successfully",
      data: result,
    });
  },
);

const updateProject = catchAsync(
  async (req: Request, res: Response) => {
    const result = await projectService.updateProject(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Project updated successfully",
      data: result,
    });
  },
);

const deleteProject = catchAsync(
  async (req: Request, res: Response) => {
    await projectService.deleteProject(req.params.id as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Project deleted successfully",
      data: null,
    });
  },
);

export const projectController = {
  createProject,
  getAllProjects,
  getPublishedProjects,
  getFeaturedProjects,
  getProjectsByService,
  getProjectById,
  getPublishedProjectBySlug,
  updateProject,
  deleteProject,
};
