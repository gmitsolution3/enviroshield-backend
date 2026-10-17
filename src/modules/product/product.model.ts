import { model, Schema } from "mongoose";
import { PRODUCT_STATUS } from "./product.constant";
import {
  TProduct,
  TProductImage,
  TProductSEO,
} from "./product.types";

const productImageSchema = new Schema<TProductImage>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    alt: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const productSEOSchema = new Schema<TProductSEO>(
  {
    metaTitle: {
      type: String,
      required: true,
      trim: true,
    },
    metaDescription: {
      type: String,
      required: true,
      trim: true,
    },
    keywords: {
      type: [String],
      required: true,
      default: [],
    },
    ogTitle: {
      type: String,
      required: true,
      trim: true,
    },
    ogDescription: {
      type: String,
      required: true,
      trim: true,
    },
    ogImage: {
      type: String,
      required: true,
      trim: true,
    },
    ogImagePublicId: {
      type: String,
      required: true,
      trim: true,
    },
    noIndex: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const productSchema = new Schema<TProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    shortDescription: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: Schema.Types.Mixed,
      required: true,
    },

    primaryImage: {
      type: productImageSchema,
      required: true,
    },

    gallery: {
      type: [productImageSchema],
      required: true,
      default: [],
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    weight: {
      type: Number,
      required: true,
      min: 0,
    },

    tdsUrl: {
      type: String,
      required: true,
      trim: true,
    },

    tdsPublicId: {
      type: String,
      required: true,
      trim: true,
    },

    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    lowStockThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },

    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      required: true,
      default: PRODUCT_STATUS.DRAFT,
    },

    isFeatured: {
      type: Boolean,
      required: true,
      default: false,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    seo: {
      type: productSEOSchema,
      required: true,
    },
  },
  {
    strict: true,
    timestamps: true,
    versionKey: false,
  },
);

productSchema.index({
  categoryId: 1,
});

productSchema.index({
  status: 1,
  publishedAt: -1,
});

productSchema.index({
  isFeatured: 1,
  status: 1,
});

productSchema.index({
  name: "text",
  slug: "text",
  sku: "text",
  shortDescription: "text",
  description: "text",
});

const Product = model<TProduct>("Product", productSchema);

export default Product;
