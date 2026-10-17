import httpStatus from "http-status";
import { TPaginationOptions } from "../../types/common";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import Category from "./category.model";
import { TCategory } from "./category.types";

const createCategory = async (payload: TCategory) => {
  const existingCategory = await Category.findOne({
    slug: payload.slug,
  });

  if (existingCategory) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A category with this slug already exists",
    );
  }

  const result = await Category.create(payload);

  return result;
};

const getAllCategories = async (
  query: TPaginationOptions,
) => {
  const { page, limit, skip } = calculatePagination(query);

  const filter = {};

  const categories = await Category.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Category.countDocuments(filter);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: categories,
  };
};

const getCategoryById = async (categoryId: string) => {
  const result = await Category.findById(categoryId);

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Category not found",
    );
  }

  return result;
};

const getCategoryBySlug = async (slug: string) => {
  const result = await Category.findOne({ slug });

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Category not found",
    );
  }

  return result;
};

const updateCategory = async (
  categoryId: string,
  payload: Partial<TCategory>,
) => {
  const existingCategory = await Category.findById(categoryId);

  if (!existingCategory) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Category not found",
    );
  }

  if (
    payload.slug &&
    payload.slug !== existingCategory.slug
  ) {
    const slugExists = await Category.findOne({
      slug: payload.slug,
      _id: { $ne: categoryId },
    });

    if (slugExists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A category with this slug already exists",
      );
    }
  }

  const result = await Category.findByIdAndUpdate(
    categoryId,
    payload,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Category not found",
    );
  }

  return result;
};

const deleteCategory = async (categoryId: string) => {
  const existingCategory = await Category.findById(categoryId);

  if (!existingCategory) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Category not found",
    );
  }

  await Category.findByIdAndDelete(categoryId);

  return null;
};

export const categoryService = {
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
};