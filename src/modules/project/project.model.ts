import { Schema, model } from "mongoose";
import { PROJECT_STATUS } from "./project.constant";
import {
  TProject,
  TProjectClient,
  TProjectImage,
  TProjectLocation,
  TProjectSEO,
} from "./project.types";

const projectImageSchema = new Schema<TProjectImage>(
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

const projectLocationSchema = new Schema<TProjectLocation>(
  {
    city: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const projectClientSchema = new Schema<TProjectClient>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logo: {
      type: projectImageSchema,
    },
  },
  {
    _id: false,
  },
);

const projectSEOSchema = new Schema<TProjectSEO>(
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

const projectSchema = new Schema<TProject>(
  {
    title: {
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

    primaryImage: {
      type: projectImageSchema,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: projectLocationSchema,
      required: true,
    },

    completionDate: {
      type: Date,
      required: true,
    },

    gallery: {
      type: [projectImageSchema],
      default: [],
    },

    client: {
      type: projectClientSchema,
      required: true,
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.DRAFT,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    seo: {
      type: projectSEOSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

projectSchema.index({
  status: 1,
  completionDate: -1,
});

projectSchema.index({
  isFeatured: 1,
  status: 1,
});

projectSchema.index({
  serviceId: 1,
});

const Project = model<TProject>("Project", projectSchema);

export default Project;
