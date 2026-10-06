import httpStatus from "http-status";
import { ObjectId } from "mongodb";
import { client } from "../../config/mongodb";
import { TPaginationOptions } from "../../types/common";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import { BLOG_STATUS } from "./blog.constant";
import Blog from "./blog.model";
import { TBlog } from "./blog.types";

const getAuthorDetails = async (authorId: string) => {
  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection("user").findOne(
    {
      _id: new ObjectId(authorId),
    },
    {
      projection: {
        _id: 0,
        id: 1,
        name: 1,
        email: 1,
        image: 1,
      },
    },
  );

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
  };
};

const attachAuthor = async (blog: any) => {
  const blogObject = blog.toObject();

  return {
    ...blogObject,
    author: await getAuthorDetails(blogObject.authorId),
  };
};

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

  return attachAuthor(result);
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

  const data = await Promise.all(
    blogs.map((blog) => attachAuthor(blog)),
  );

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data,
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

  const data = await Promise.all(
    blogs.map((blog) => attachAuthor(blog)),
  );

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data,
  };
};

const getBlogById = async (blogId: string) => {
  const result = await Blog.findById(blogId);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Blog not found");
  }

  return attachAuthor(result);
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

  return attachAuthor(result);
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

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Blog not found");
  }

  return attachAuthor(result);
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
