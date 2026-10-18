import httpStatus from "http-status";
import { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { PRODUCT_STATUS } from "../product/product.constant";
import Product from "../product/product.model";

type TCartItemInput = {
  productId: string;
  quantity: number;
};

type TCalculateCartPayload = {
  items: TCartItemInput[];
};

const calculateCart = async (payload: TCalculateCartPayload) => {
  // Combine duplicate product IDs before checking stock.
  const requestedQuantities = new Map<string, number>();

  for (const item of payload.items) {
    const productId = item.productId.toLowerCase();

    const combinedQuantity =
      (requestedQuantities.get(productId) ?? 0) + item.quantity;

    if (combinedQuantity > 99) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Combined quantity for a product cannot exceed 99",
      );
    }

    requestedQuantities.set(productId, combinedQuantity);
  }

  const productIds = [...requestedQuantities.keys()];

  const products = await Product.find({
    _id: {
      $in: productIds.map((id) => new Types.ObjectId(id)),
    },
    status: PRODUCT_STATUS.PUBLISHED,
  }).select("_id name slug sku primaryImage price stockQuantity");

  // Draft, deleted, and otherwise unavailable products are rejected.
  if (products.length !== productIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "One or more products are unavailable",
    );
  }

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  const items = productIds.map((productId) => {
    const product = productMap.get(productId);
    const quantity = requestedQuantities.get(productId)!;

    if (!product) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "One or more products are unavailable",
      );
    }

    if (product.stockQuantity < quantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient stock for "${product.name}". Available quantity: ${product.stockQuantity}`,
      );
    }

    const unitPrice = product.price;
    const lineTotal = Number((unitPrice * quantity).toFixed(2));

    return {
      productId: product._id.toString(),
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      primaryImage: product.primaryImage,
      unitPrice,
      quantity,
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
