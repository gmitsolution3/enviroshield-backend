import httpStatus from "http-status";
import { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { PRODUCT_STATUS } from "../product/product.constant";
import Product from "../product/product.model";

type TCartItemInput = {
  productId: string;
  variantId?: string;
  quantity: number;
};

type TCalculateCartPayload = {
  items: TCartItemInput[];
};

const calculateCart = async (payload: TCalculateCartPayload) => {
  // Combine duplicate product ID + variant ID items before checking stock.
  const requestedItems = new Map<
    string,
    { productId: string; variantId?: string; quantity: number }
  >();

  for (const item of payload.items) {
    const key = `${item.productId.toLowerCase()}:${item.variantId ?? ""}`;
    const existing = requestedItems.get(key);
    const combinedQuantity = (existing?.quantity ?? 0) + item.quantity;

    if (combinedQuantity > 99) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Combined quantity for an item cannot exceed 99",
      );
    }

    requestedItems.set(key, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: combinedQuantity,
    });
  }

  const uniqueProductIds = [
    ...new Set([...requestedItems.values()].map((i) => i.productId)),
  ];

  const products = await Product.find({
    _id: {
      $in: uniqueProductIds.map((id) => new Types.ObjectId(id)),
    },
    status: PRODUCT_STATUS.PUBLISHED,
  }).select("_id name slug sku primaryImage price stockQuantity variants");

  // Draft, deleted, and otherwise unavailable products are rejected.
  if (products.length !== uniqueProductIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "One or more products are unavailable",
    );
  }

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  const items = [...requestedItems.values()].map((requested) => {
    const product = productMap.get(requested.productId);

    if (!product) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "One or more products are unavailable",
      );
    }

    const hasVariants =
      Array.isArray(product.variants) && product.variants.length > 0;
    let targetVariant: (typeof product.variants)[0] | undefined;

    if (hasVariants) {
      if (requested.variantId) {
        targetVariant = product.variants.find(
          (v) => v._id?.toString() === requested.variantId,
        );
        if (!targetVariant) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Selected weight is no longer available for "${product.name}".`,
          );
        }
      } else if (product.variants.length === 1) {
        targetVariant = product.variants[0];
      } else {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Please select a weight for "${product.name}".`,
        );
      }
    }

    const availableStock = targetVariant
      ? targetVariant.stockQuantity
      : product.stockQuantity;

    const variantLabel = targetVariant
      ? targetVariant.weight || targetVariant.size || ""
      : "";

    if (availableStock < requested.quantity) {
      const weightLabel = variantLabel ? ` (${variantLabel})` : "";
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient stock for "${product.name}${weightLabel}". Available quantity: ${availableStock}`,
      );
    }

    const unitPrice = targetVariant ? targetVariant.price : product.price;
    const lineTotal = Number((unitPrice * requested.quantity).toFixed(2));

    return {
      productId: product._id.toString(),
      variantId: targetVariant?._id ? targetVariant._id.toString() : undefined,
      weight: variantLabel,
      size: variantLabel,
      name: product.name,
      slug: product.slug,
      sku: targetVariant?.sku || product.sku,
      primaryImage: product.primaryImage,
      unitPrice,
      quantity: requested.quantity,
      lineTotal,
    };
  });

  const subtotal = Number(
    items
      .reduce((total, item) => total + item.lineTotal, 0)
      .toFixed(2),
  );

  const totalItems = items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return {
    items,
    summary: {
      totalItems,
      subtotal,
      currency: "BDT",
    },
  };
};

export const cartService = {
  calculateCart,
};
