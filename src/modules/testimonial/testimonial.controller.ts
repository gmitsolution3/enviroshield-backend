import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { testimonialService } from "./testimonial.service";

const createTestimonial = catchAsync(async (req, res) => {
  const result = await testimonialService.createTestimonial(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Testimonial created successfully",
    data: result,
  });
});

const getAllTestimonials = catchAsync(async (req, res) => {
  const result = await testimonialService.getAllTestimonials({
    page: req.query.page as string,
    limit: req.query.limit as string,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Testimonials retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getPublishedTestimonials = catchAsync(async (req, res) => {
  const result = await testimonialService.getPublishedTestimonials({
    page: req.query.page as string,
    limit: req.query.limit as string,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Published testimonials retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getTestimonialById = catchAsync(async (req, res) => {
  const result = await testimonialService.getTestimonialById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Testimonial retrieved successfully",
    data: result,
  });
});

const updateTestimonial = catchAsync(async (req, res) => {
  const result = await testimonialService.updateTestimonial(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Testimonial updated successfully",
    data: result,
  });
});

const deleteTestimonial = catchAsync(async (req, res) => {
  await testimonialService.deleteTestimonial(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Testimonial deleted successfully",
    data: null,
  });
});

export const testimonialController = {
  createTestimonial,
  getAllTestimonials,
  getPublishedTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
};
