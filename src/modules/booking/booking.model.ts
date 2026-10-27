import { model, Schema } from "mongoose";
import { BOOKING_STATUSES, BOOKING_STATUS } from "./booking.constant";
import { TBooking, TBookingProject } from "./booking.types";

const bookingProjectSchema = new Schema<TBookingProject>(
  {
    location: { type: String, required: true, trim: true },
    areaSize: { type: Number, min: 0 },
    areaUnit: { type: String, trim: true },
    message: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const bookingSchema = new Schema<TBooking>(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    // Better Auth IDs are strings and there is no Mongoose User model in this app.
    userId: { type: String, required: true, index: true },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    project: { type: bookingProjectSchema, required: true },
    isSiteVisit: { type: Boolean, required: true, default: false },
    siteVisitDate: { type: Date },
    finalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      required: true,
      default: BOOKING_STATUS.PENDING,
      index: true,
    },
    adminNotes: { type: String, trim: true, maxlength: 2000 },
  },
  {
    strict: true,
    timestamps: true,
    versionKey: false,
  },
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });

const Booking = model<TBooking>("Booking", bookingSchema);

export default Booking;
