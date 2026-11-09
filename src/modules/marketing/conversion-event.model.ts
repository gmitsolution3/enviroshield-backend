import { Document, Model, Schema, model } from "mongoose";

export type TConversionEventStatus =
  | "pending"
  | "dispatched"
  | "failed"
  | "suppressed";

export type TConversionEntityType = "contact" | "booking" | "order";

export interface IConversionEvent {
  eventId: string;
  eventName: string;
  entityType: TConversionEntityType;
  entityId: string;
  payload: Record<string, unknown>;
  status: TConversionEventStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  dispatchedAt?: Date;
  nextAttemptAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IConversionEventDocument
  extends IConversionEvent,
    Document {}

export type IConversionEventModel = Model<IConversionEventDocument>;

const conversionEventSchema = new Schema<
  IConversionEventDocument,
  IConversionEventModel
>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ["contact", "booking", "order"],
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "dispatched", "failed", "suppressed"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    lastError: {
      type: String,
      default: "",
    },
    dispatchedAt: {
      type: Date,
    },
    nextAttemptAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const ConversionEvent = model<
  IConversionEventDocument,
  IConversionEventModel
>("ConversionEvent", conversionEventSchema);
