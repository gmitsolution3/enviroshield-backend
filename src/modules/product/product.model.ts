import { model, Schema } from "mongoose";
import { PRODUCT_STATUS } from "./product.constant";
import {
  TProduct,
  TProductImage,
  TProductSEO,
  TProductVariant,
} from "./product.types";

const productVariantSchema = new Schema<TProductVariant>(
  {
    weight: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 5,
    },
  },
  {
    _id: true,
  },
);

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
      default: [],
    },

    variants: {
      type: [productVariantSchema],
      required: true,
      default: [],
      validate: [
        {
          validator: function (variants: TProductVariant[]) {
            if (!variants || variants.length === 0) return true;
            const weights = variants.map((v) =>
              (v.weight || v.size || "").trim().toLowerCase(),
            );
            return new Set(weights).size === weights.length;
          },
          message: "Duplicate variant weights are not allowed.",
        },
      ],
    },

    price: {
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

productSchema.pre("validate", function () {
  if (this.variants && this.variants.length > 0) {
    for (const v of this.variants) {
      const val = (v.weight || v.size || "").trim();
      v.weight = val;
      v.size = val;
    }
    const prices = this.variants.map((v) => v.price);
    this.price = Math.min(...prices);
    this.stockQuantity = this.variants.reduce(
      (sum, v) => sum + (v.stockQuantity || 0),
      0,
    );
  }
});

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
