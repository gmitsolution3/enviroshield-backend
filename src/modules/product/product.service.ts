
import httpStatus from "http-status";
import { TPaginationOptions } from "../../types/common";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import Category from "../category/category.model";
import { PRODUCT_STATUS } from "./product.constant";
import Product from "./product.model";
import { TProduct } from "./product.types";

type TProductQuery = TPaginationOptions & {
  search?: string;
  categoryId?: string;
  status?: "draft" | "published";
  isFeatured?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

const createProduct = async (payload: TProduct) => {
  const existingProduct = await Product.findOne({
    $or: [{ slug: payload.slug }, { sku: payload.sku }],
  });

  if (existingProduct) {
    if (existingProduct.slug === payload.slug) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A product with this slug already exists",
      );
    }

    throw new AppError(
      httpStatus.CONFLICT,
      "A product with this SKU already exists",
    );
  }

  const category = await Category.findById(payload.categoryId);

  if (!category) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Category not found",
    );
  }

  if (payload.status === PRODUCT_STATUS.PUBLISHED) {
    payload.publishedAt = payload.publishedAt ?? new Date();
  } else {
    payload.publishedAt = null;
  }

  return Product.create(payload);
};

const buildProductFilter = (query: TProductQuery) => {
  const filter: Record<string, any> = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.categoryId) {
    filter.categoryId = query.categoryId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.isFeatured !== undefined) {
    filter.isFeatured = query.isFeatured === "true";
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};

    if (query.minPrice !== undefined) {
      filter.price.$gte = Number(query.minPrice);
    }

    if (query.maxPrice !== undefined) {
      filter.price.$lte = Number(query.maxPrice);
    }
  }

  if (query.inStock !== undefined) {
    filter.stockQuantity =
      query.inStock === "true" ? { $gt: 0 } : { $lte: 0 };
  }

  return filter;
};

const getProducts = async (
  query: TProductQuery,
  publicOnly = false,
) => {
  const { page, limit, skip } = calculatePagination(query);
  const filter = buildProductFilter(query);

  if (publicOnly) {
    filter.status = PRODUCT_STATUS.PUBLISHED;
  }

  const sortField = query.sortBy || "createdAt";
  const sortDirection = query.sortOrder === "asc" ? 1 : -1;

  let productQuery = Product.find(filter)
    .sort({ [sortField]: sortDirection })
    .skip(skip)
    .limit(limit);

  if (publicOnly) {
    productQuery = productQuery.select("-costPrice");
  }

  const [products, total] = await Promise.all([
    productQuery,
    Product.countDocuments(filter),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: products,
  };
};

const getAllProducts = async (query: TProductQuery) => {
  return getProducts(query);
};

const getPublishedProducts = async (query: TProductQuery) => {
  return getProducts(query, true);
};

const getProductById = async (productId: string) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Product not found",
    );
  }

  return product;
};

const getPublishedProductBySlug = async (slug: string) => {
  const product = await Product.findOne({
    slug,
    status: PRODUCT_STATUS.PUBLISHED,
  }).select("-costPrice");

  if (!product) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Published product not found",
    );
  }

  return product;
};

const updateProduct = async (
  productId: string,
  payload: Partial<TProduct>,
) => {
  const existingProduct = await Product.findById(productId);

  if (!existingProduct) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Product not found",
    );
  }

  if (payload.categoryId) {
    const category = await Category.findById(payload.categoryId);

    if (!category) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Category not found",
      );
    }
  }

  if (payload.slug && payload.slug !== existingProduct.slug) {
    const slugExists = await Product.findOne({
      slug: payload.slug,
      _id: { $ne: productId },
    });

    if (slugExists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A product with this slug already exists",
      );
    }
  }

  if (payload.sku && payload.sku !== existingProduct.sku) {
    const skuExists = await Product.findOne({
      sku: payload.sku,
      _id: { $ne: productId },
    });

    if (skuExists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A product with this SKU already exists",
      );
    }
  }

  if (payload.status === PRODUCT_STATUS.PUBLISHED) {
    if (
      existingProduct.status !== PRODUCT_STATUS.PUBLISHED ||
      !existingProduct.publishedAt
    ) {
      payload.publishedAt = new Date();
    }
  }

  if (payload.status === PRODUCT_STATUS.DRAFT) {
    payload.publishedAt = null;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    payload,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedProduct) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Product not found",
    );
  }

  return updatedProduct;
};

const deleteProduct = async (productId: string) => {
  const existingProduct = await Product.findById(productId);

  if (!existingProduct) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Product not found",
    );
  }

  await Product.findByIdAndDelete(productId);

  return null;
};

export const productService = {
  createProduct,
  getAllProducts,
  getPublishedProducts,
  getProductById,
  getPublishedProductBySlug,
  updateProduct,
  deleteProduct,
};
