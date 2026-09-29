import { Schema, model } from "mongoose";
import { BLOG_STATUS } from "./blog.constant";
import { TBlog } from "./blog.types";

const blogImageSchema = new Schema(
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

const blogSEOSchema = new Schema(
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

const blogSchema = new Schema<TBlog>(
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

    excerpt: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: Schema.Types.Mixed,
      required: true,
    },

    coverImage: {
      type: blogImageSchema,
      required: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    authorId: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(BLOG_STATUS),
      default: BLOG_STATUS.DRAFT,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    seo: {
      type: blogSEOSchema,
      default: undefined,
    },
  },
  {
    strict: true,
    timestamps: true,
    versionKey: false
  },
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ tags: 1 });

const Blog = model<TBlog>("Blog", blogSchema);

export default Blog;
