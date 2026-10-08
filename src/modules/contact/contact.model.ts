import { Schema, model } from "mongoose";
import {
  CONTACT_AREA_UNIT,
  CONTACT_PROJECT_TIMELINE,
  CONTACT_PROJECT_TYPE,
  CONTACT_SOURCE,
  CONTACT_STATUS,
} from "./contact.constant";
import { TContact, TContactProjectLocation } from "./contact.types";

const projectLocationSchema = new Schema<TContactProjectLocation>(
  {
    address: {
      type: String,
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const contactSchema = new Schema<TContact>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    companyName: {
      type: String,
      trim: true,
    },

    jobTitle: {
      type: String,
      trim: true,
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
    },

    projectName: {
      type: String,
      trim: true,
    },

    projectType: {
      type: String,
      enum: Object.values(CONTACT_PROJECT_TYPE),
    },

    projectLocation: {
      type: projectLocationSchema,
    },

    projectAreaSize: {
      type: Number,
      min: 0,
    },

    projectAreaUnit: {
      type: String,
      enum: Object.values(CONTACT_AREA_UNIT),
    },

    siteVisitRequired: {
      type: Boolean,
    },

    projectTimeline: {
      type: String,
      enum: Object.values(CONTACT_PROJECT_TIMELINE),
    },

    message: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(CONTACT_STATUS),
      default: CONTACT_STATUS.NEW,
    },

    source: {
      type: String,
      enum: Object.values(CONTACT_SOURCE),
      default: CONTACT_SOURCE.WEBSITE,
    },

    adminNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ phoneNumber: 1 });
contactSchema.index({ serviceId: 1 });

const Contact = model<TContact>("Contact", contactSchema);

export default Contact;
