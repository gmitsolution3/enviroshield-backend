import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import { TESTIMONIAL_STATUS } from "./testimonial.constant";
import Testimonial from "./testimonial.model";
import { TTestimonial } from "./testimonial.types";

const createTestimonial = async (
  payload: TTestimonial,
) => {
  const result = await Testimonial.create(payload);

  return result;
};

const getAllTestimonials = async (query: {
  page?: string;
  limit?: string;
}) => {
  const { page, limit, skip } =
    calculatePagination(query);

  const testimonials = await Testimonial.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total =
    await Testimonial.countDocuments({});

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: testimonials,
  };
};

const getPublishedTestimonials = async (query: {
  page?: string;
  limit?: string;
}) => {
  const { page, limit, skip } =
    calculatePagination(query);

  const filter = {
    status: TESTIMONIAL_STATUS.PUBLISHED,
  };

  const testimonials = await Testimonial.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total =
    await Testimonial.countDocuments(filter);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: testimonials,
  };
};

const getTestimonialById = async (
  testimonialId: string,
) => {
  const result =
    await Testimonial.findById(testimonialId);

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Testimonial not found",
    );
  }

  return result;
};

const updateTestimonial = async (
  testimonialId: string,
  payload: Partial<TTestimonial>,
) => {
  const existingTestimonial =
    await Testimonial.findById(testimonialId);

  if (!existingTestimonial) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Testimonial not found",
    );
  }

  const result =
    await Testimonial.findByIdAndUpdate(
      testimonialId,
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

  return result;
};

const deleteTestimonial = async (
  testimonialId: string,
) => {
  const existingTestimonial =
    await Testimonial.findById(testimonialId);

  if (!existingTestimonial) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Testimonial not found",
    );
  }

  await Testimonial.findByIdAndDelete(
    testimonialId,
  );

  return null;
};

export const testimonialService = {
  createTestimonial,
  getAllTestimonials,
  getPublishedTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
};