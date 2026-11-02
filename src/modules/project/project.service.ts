import { TPaginationOptions } from "../../types/common";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import Service from "../service/service.model";
import { PROJECT_STATUS } from "./project.constant";
import Project from "./project.model";
import { TProject } from "./project.types";

const createProject = async (payload: TProject) => {
  const existingProject = await Project.findOne({
    slug: payload.slug,
  });

  if (existingProject) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A project with this slug already exists",
    );
  }

  const service = await Service.findById(payload.serviceId);

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  const project = await Project.create(payload);

  await Service.findByIdAndUpdate(payload.serviceId, {
    $addToSet: {
      projects: project._id,
    },
  });

  return project;
};

const getAllProjects = async (
  query: TPaginationOptions & {
    status?: string;
    serviceId?: string;
    search?: string;
    searchTerm?: string;
    isFeatured?: string;
  },
) => {
  const { page, limit, skip } = calculatePagination(query);
  const filter: Record<string, unknown> = {};

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  if (query.serviceId) {
    filter.serviceId = query.serviceId;
  }

  if (query.isFeatured !== undefined) {
    filter.isFeatured = query.isFeatured === "true";
  }

  const search = (query.search || query.searchTerm)?.trim();
  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [
      { title: searchRegex },
      { client: searchRegex },
      { location: searchRegex },
    ];
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("serviceId")
      .sort({ completionDate: -1 })
      .skip(skip)
      .limit(limit),
    Project.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: projects,
  };
};

const getPublishedProjects = async (query: {
  page?: string;
  limit?: string;
}) => {
  const { page, limit, skip } = calculatePagination(query);

  const filter = {
    status: PROJECT_STATUS.PUBLISHED,
  };

  const projects = await Project.find(filter)
    .populate("serviceId")
    .sort({ completionDate: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Project.countDocuments(filter);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: projects,
  };
};

const getFeaturedProjects = async () => {
  const projects = await Project.find({
    status: PROJECT_STATUS.PUBLISHED,
    isFeatured: true,
  })
    .populate("serviceId")
    .sort({ completionDate: -1 });

  return projects;
};

const getProjectsByService = async (
  serviceId: string,
  query: {
    page?: string;
    limit?: string;
  },
) => {
  const service = await Service.findById(serviceId);

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  const { page, limit, skip } = calculatePagination(query);

  const filter = {
    serviceId,
    status: PROJECT_STATUS.PUBLISHED,
  };

  const projects = await Project.find(filter)
    .populate("serviceId")
    .sort({ completionDate: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Project.countDocuments(filter);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: projects,
  };
};

const getProjectById = async (projectId: string) => {
  const project =
    await Project.findById(projectId).populate("serviceId");

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  return project;
};

const getPublishedProjectBySlug = async (slug: string) => {
  const project = await Project.findOne({
    slug,
    status: PROJECT_STATUS.PUBLISHED,
  }).populate("serviceId");

  if (!project) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Published project not found",
    );
  }

  return project;
};

const updateProject = async (
  projectId: string,
  payload: Partial<TProject>,
) => {
  const existingProject = await Project.findById(projectId);

  if (!existingProject) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  if (payload.slug && payload.slug !== existingProject.slug) {
    const slugExists = await Project.findOne({
      slug: payload.slug,
      _id: { $ne: projectId },
    });

    if (slugExists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A project with this slug already exists",
      );
    }
  }

  if (
    payload.serviceId &&
    payload.serviceId.toString() !==
      existingProject.serviceId.toString()
  ) {
    const newService = await Service.findById(payload.serviceId);

    if (!newService) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "New service not found",
      );
    }
  }

  const oldServiceId = existingProject.serviceId;

  const newServiceId = payload.serviceId;

  const updatedProject = await Project.findByIdAndUpdate(
    projectId,
    payload,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedProject) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  if (
    newServiceId &&
    newServiceId.toString() !== oldServiceId.toString()
  ) {
    await Service.findByIdAndUpdate(oldServiceId, {
      $pull: {
        projects: projectId,
      },
    });

    await Service.findByIdAndUpdate(newServiceId, {
      $addToSet: {
        projects: projectId,
      },
    });
  }

  return Project.findById(projectId).populate("serviceId");
};

const deleteProject = async (projectId: string) => {
  const existingProject = await Project.findById(projectId);

  if (!existingProject) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  await Project.findByIdAndDelete(projectId);

  await Service.findByIdAndUpdate(existingProject.serviceId, {
    $pull: {
      projects: projectId,
    },
  });

  return null;
};

export const projectService = {
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
