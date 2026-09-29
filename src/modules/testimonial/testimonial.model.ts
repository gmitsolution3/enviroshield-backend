import { Schema, model } from "mongoose";
import { TESTIMONIAL_STATUS } from "./testimonial.constant";
import { TTestimonial, TTestimonialImage } from "./testimonial.types";

const testimonialImageSchema = new Schema<TTestimonialImage>(
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
  },
  { _id: false },
);

const testimonialSchema = new Schema<TTestimonial>(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    clientImage: {
      type: testimonialImageSchema,
      required: false,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(TESTIMONIAL_STATUS),
      default: TESTIMONIAL_STATUS.DRAFT,
    },
  },
  {
    timestamps: true,
  },
);

testimonialSchema.index({
  status: 1,
  createdAt: -1,
});

const Testimonial = model<TTestimonial>(
  "Testimonial",
  testimonialSchema,
);

export default Testimonial;
