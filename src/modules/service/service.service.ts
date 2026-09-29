import httpStatus from "http-status";
import { TPaginationOptions } from "../../types/common";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import { SERVICE_STATUS } from "./service.constant";
import Service from "./service.model";
import { TService } from "./service.types";

const createService = async (payload: Omit<TService, "projects">) => {
  const existingService = await Service.findOne({
    slug: payload.slug,
  });

  if (existingService) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A service with this slug already exists",
    );
  }

  if (payload.isFeatured) {
    const featuredCount = await Service.countDocuments({
      isFeatured: true,
    });

    if (featuredCount >= 3) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Maximum 3 services can be featured",
      );
    }
  }

  if (
    payload.status === SERVICE_STATUS.PUBLISHED &&
    !payload.publishedAt
  ) {
    payload.publishedAt = new Date();
  }

  if (payload.status === SERVICE_STATUS.DRAFT) {
    payload.publishedAt = null;
  }

  const result = await Service.create({
    ...payload,
    projects: [],
  });

  return result;
};

const getAllServices = async (query: TPaginationOptions) => {
  const { page, limit, skip } = calculatePagination(query);

  const services = await Service.find({})
    //todo: implement later .populate("projects")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Service.countDocuments({});

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: services,
  };
};

const getPublishedServices = async (query: TPaginationOptions) => {
  const { page, limit, skip } = calculatePagination(query);

  const filter = {
    status: SERVICE_STATUS.PUBLISHED,
  };

  const services = await Service.find(filter)
    //todo: to implement this after projects feature development .populate("projects")
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Service.countDocuments(filter);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: services,
  };
};

const getFeaturedServices = async () => {
  const services = await Service.find({
    status: SERVICE_STATUS.PUBLISHED,
    isFeatured: true,
  })
    //todo: to implement this after projects feature development .populate("projects")
    .sort({ publishedAt: -1 });

  return services;
};

const getServiceById = async (serviceId: string) => {
  const result =
    await Service.findById(serviceId).populate("projects");

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  return result;
};

const getPublishedServiceBySlug = async (slug: string) => {
  const result = await Service.findOne({
    slug,
    status: SERVICE_STATUS.PUBLISHED,
  });

  //todo: to implement this after projects feature development .populate("projects")

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Published service not found",
    );
  }

  return result;
};

const updateService = async (
  serviceId: string,
  payload: Partial<Omit<TService, "projects">>,
) => {
  const existingService = await Service.findById(serviceId);

  if (!existingService) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  if (payload.slug && payload.slug !== existingService.slug) {
    const slugExists = await Service.findOne({
      slug: payload.slug,
      _id: { $ne: serviceId },
    });

    if (slugExists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A service with this slug already exists",
      );
    }
  }

  if (payload.isFeatured && !existingService.isFeatured) {
    const featuredCount = await Service.countDocuments({
      isFeatured: true,
      _id: { $ne: serviceId },
    });

    if (featuredCount >= 3) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Maximum 3 services can be featured",
      );
    }
  }

  if (payload.status === SERVICE_STATUS.PUBLISHED) {
    if (
      existingService.status !== SERVICE_STATUS.PUBLISHED ||
      !existingService.publishedAt
    ) {
      payload.publishedAt = new Date();
    }
  }

  if (payload.status === SERVICE_STATUS.DRAFT) {
    payload.publishedAt = null;
  }

  const result = await Service.findByIdAndUpdate(serviceId, payload, {
    new: true,
    runValidators: true,
  });

  //todo: .populate("projects"), to implement this after projects feature

  return result;
};

const deleteService = async (serviceId: string) => {
  const existingService = await Service.findById(serviceId);

  if (!existingService) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  if (existingService.projects.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot delete a service that has projects",
    );
  }

  await Service.findByIdAndDelete(serviceId);

  return null;
};

export const serviceService = {
  createService,
  getAllServices,
  getPublishedServices,
  getFeaturedServices,
  getServiceById,
  getPublishedServiceBySlug,
  updateService,
  deleteService,
};
