import httpStatus from "http-status";
import { TPaginationOptions } from "../../types/common";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import { BLOG_STATUS } from "./blog.constant";
import Blog from "./blog.model";
import { TBlog } from "./blog.types";

const createBlog = async (payload: TBlog) => {
  const existingBlog = await Blog.findOne({
    slug: payload.slug,
  });

  if (existingBlog) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A blog with this slug already exists",
    );
  }

  if (payload.status === "published" && !payload.publishedAt) {
    payload.publishedAt = new Date();
  }

  if (payload.status === "draft") {
    payload.publishedAt = null;
  }

  const result = await Blog.create(payload);

  return result;
};

const getAllBlogs = async (query: TPaginationOptions) => {
  const { page, limit, skip } = calculatePagination(query);

  const filter = {};

  const blogs = await Blog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Blog.countDocuments(filter);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: blogs,
  };
};

const getPublishedBlogs = async (query: TPaginationOptions) => {
  const { page, limit, skip } = calculatePagination(query);

  const filter = {
    status: BLOG_STATUS.PUBLISHED,
  };

  const blogs = await Blog.find(filter)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Blog.countDocuments(filter);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: blogs,
  };
};

const getBlogById = async (blogId: string) => {
  const result = await Blog.findById(blogId);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Blog not found");
  }

  return result;
};

const getPublishedBlogBySlug = async (slug: string) => {
  const result = await Blog.findOne({
    slug,
    status: "published",
  });

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Published blog not found",
    );
  }

  return result;
};

const updateBlog = async (
  blogId: string,
  payload: Partial<TBlog>,
) => {
  const existingBlog = await Blog.findById(blogId);

  if (!existingBlog) {
    throw new AppError(httpStatus.NOT_FOUND, "Blog not found");
  }

  if (payload.slug && payload.slug !== existingBlog.slug) {
    const slugExists = await Blog.findOne({
      slug: payload.slug,
      _id: { $ne: blogId },
    });

    if (slugExists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A blog with this slug already exists",
      );
    }
  }

  if (payload.status === "published") {
    if (
      existingBlog.status !== "published" ||
      !existingBlog.publishedAt
    ) {
      payload.publishedAt = new Date();
    }
  }

  if (payload.status === "draft") {
    payload.publishedAt = null;
  }

  const result = await Blog.findByIdAndUpdate(blogId, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteBlog = async (blogId: string) => {
  const existingBlog = await Blog.findById(blogId);

  if (!existingBlog) {
    throw new AppError(httpStatus.NOT_FOUND, "Blog not found");
  }

  await Blog.findByIdAndDelete(blogId);

  return null;
};

export const blogService = {
  createBlog,
  getAllBlogs,
  getPublishedBlogs,
  getBlogById,
  getPublishedBlogBySlug,
  updateBlog,
  deleteBlog,
};
