import { model, Schema } from "mongoose";
import { TCategory } from "./category.types";

const categorySchema = new Schema<TCategory>(
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
  },
  {
    strict: true,
    timestamps: true,
    versionKey: false,
  },
);

const Category = model<TCategory>("Category", categorySchema);

export default Category;