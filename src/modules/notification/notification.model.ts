import { Schema, model } from "mongoose";
import {
  NOTIFICATION_ENTITY_TYPE,
  NOTIFICATION_TYPE,
} from "./notification.constant";
import { TNotification } from "./notification.types";

const notificationSchema = new Schema<TNotification>(
  {
    recipient: {
      type: String,
      required: [true, "Recipient is required"],
      index: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: [true, "Notification type is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: 1000,
    },
    entityType: {
      type: String,
      enum: Object.values(NOTIFICATION_ENTITY_TYPE),
      required: false,
    },
    entityId: {
      type: String,
      required: false,
      trim: true,
    },
    actionUrl: {
      type: String,
      required: false,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound indexes for optimal retrieval
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index(
  { "metadata.idempotencyKey": 1 },
  {
    sparse: true,
  },
);

const Notification = model<TNotification>("Notification", notificationSchema);

export default Notification;

