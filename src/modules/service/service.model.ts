import { model, Schema } from "mongoose";
import { SERVICE_STATUS } from "./service.constant";
import {
  TService,
  TServiceImage,
  TServiceItem,
  TServiceSection,
  TServiceSEO,
} from "./service.types";

const serviceImageSchema = new Schema<TServiceImage>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    alt: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const serviceItemSchema = new Schema<TServiceItem>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const serviceSectionSchema = new Schema<TServiceSection>(
  {
    image: {
      type: serviceImageSchema,
      required: true,
    },
    items: {
      type: [serviceItemSchema],
      required: true,
      default: [],
    },
  },
  {
    _id: false,
  },
);

const serviceSEOSchema = new Schema<TServiceSEO>(
  {
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    canonicalUrl: {
      type: String,
      trim: true,
    },
    ogTitle: {
      type: String,
      trim: true,
    },
    ogDescription: {
      type: String,
      trim: true,
    },
    ogImage: {
      type: String,
      trim: true,
    },
    noIndex: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const serviceSchema = new Schema<TService>(
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

    isFeatured: {
      type: Boolean,
      default: false,
    },

    primaryImage: {
      type: serviceImageSchema,
      required: true,
    },

    detailHeading: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    whyEnviroshield: {
      type: serviceSectionSchema,
      required: true,
    },

    process: {
      type: serviceSectionSchema,
      required: true,
    },

    benefits: {
      type: serviceSectionSchema,
      required: true,
    },

    projects: {
      type: [Schema.Types.ObjectId],
      ref: "Project",
      default: [],
    },

    status: {
      type: String,
      enum: Object.values(SERVICE_STATUS),
      default: SERVICE_STATUS.DRAFT,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    seo: {
      type: serviceSEOSchema,
      default: undefined,
    },
  },
  {
    strict: true, 
    timestamps: true,
    versionKey: false
  },
);

serviceSchema.index({
  status: 1,
  publishedAt: -1,
});

serviceSchema.index({
  isFeatured: 1,
  status: 1,
});

serviceSchema.index({
  projects: 1,
});

const Service = model<TService>("Service", serviceSchema);

export default Service;
