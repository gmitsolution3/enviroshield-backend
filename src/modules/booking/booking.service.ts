import { NOTIFICATION_ENTITY_TYPE, NOTIFICATION_TYPE } from "../notification/notification.constant";
import { notificationService } from "../notification/notification.service";
import { metaCapiService } from "../marketing/meta-capi.service";
import { randomBytes } from "crypto";
import httpStatus from "http-status";
import { ObjectId } from "mongodb";
import { Types } from "mongoose";
import { client } from "../../config/mongodb";
import { TPaginationMeta } from "../../types/common";
import { AppError } from "../../utils/AppError";
import Service from "../service/service.model";
import {
  BOOKING_STATUS,
  getAllowedBookingStatusTransitions,
  isAllowedBookingStatusTransition,
} from "./booking.constant";
import Booking from "./booking.model";
import { bookingNotification } from "./booking.notification";
import type {
  TBooking,
  TBookingQuery,
  TBookingStatus,
  TCreateBookingPayload,
} from "./booking.types";

const generateBookingNumber = () => {
  const date = new Date();
  const dateStamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");

  return `ESB-${dateStamp}-${randomBytes(4).toString("hex").toUpperCase()}`;
};

const createBooking = async (
  userId: string,
  payload: TCreateBookingPayload,
  requestContext?: { clientIp?: string; userAgent?: string },
) => {
  if (!userId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Authentication required",
    );
  }

  if (!Types.ObjectId.isValid(payload.serviceId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid service ID");
  }

  const service = await Service.findById(payload.serviceId).select(
    "_id price name",
  );

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  if (!Number.isFinite(service.price) || service.price < 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Service price is not configured",
    );
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const createdBooking = await Booking.create({
        bookingNumber: generateBookingNumber(),
        userId,
        serviceId: service._id,
        project: payload.project,
        isSiteVisit: payload.isSiteVisit ?? false,
        finalPrice: service.price,
        status: BOOKING_STATUS.PENDING,
      });

      try {
        await bookingNotification.notifyBookingPlaced(createdBooking);
      } catch (error) {
        console.error(
          `Failed to send booking confirmation email for ${createdBooking.bookingNumber}:`,
          error,
        );
      }

      // Notify admins of new booking
      void notificationService
        .notifyAdmins({
          type: NOTIFICATION_TYPE.BOOKING_CREATED,
          title: "New Service Booking",
          message: `New booking ${createdBooking.bookingNumber} placed.`,
          entityType: NOTIFICATION_ENTITY_TYPE.BOOKING,
          entityId: createdBooking._id.toString(),
          actionUrl: "/dashboard/service-bookings",
          metadata: {
            bookingNumber: createdBooking.bookingNumber,
            userId: createdBooking.userId,
          },
        })
        .catch((err) =>
          console.error("Failed to notify admins of booking placed:", err),
        );

      // Dispatch server-side Schedule event to Meta CAPI
      void (async () => {
        try {
          const userConditions: Record<string, unknown>[] = [
            { id: userId },
            { _id: userId },
          ];
          if (ObjectId.isValid(userId)) {
            userConditions.push({ _id: new ObjectId(userId) });
          }

          const userDoc = await client
            .db(process.env.MONGODB_DB)
            .collection("user")
            .findOne(
              { $or: userConditions },
              { projection: { _id: 1, id: 1, name: 1, email: 1, phone: 1 } },
            );

          await metaCapiService.dispatchScheduleEvent({
            booking: createdBooking,
            serviceTitle: service.name,
            user: userDoc
              ? {
                  id: userId,
                  name: typeof userDoc.name === "string" ? userDoc.name : undefined,
                  email: typeof userDoc.email === "string" ? userDoc.email : undefined,
                  phone: typeof userDoc.phone === "string" ? userDoc.phone : undefined,
                }
              : undefined,
            context: {
              ...payload.conversionContext,
              clientIp: requestContext?.clientIp,
              userAgent: requestContext?.userAgent,
            },
          });
        } catch (err) {
          console.error("Failed to dispatch CAPI Schedule event:", err);
        }
      })();

      return createdBooking;
    } catch (error) {
      const duplicateError = error as {
        code?: number;
        keyPattern?: Record<string, number>;
        keyValue?: Record<string, unknown>;
        message?: string;
      };
      const duplicateBookingNumber =
        duplicateError.code === 11000 &&
        (duplicateError.keyPattern?.bookingNumber ||
          duplicateError.keyValue?.bookingNumber ||
          duplicateError.message?.includes("bookingNumber"));

      if (!duplicateBookingNumber) throw error;
    }
  }

  throw new AppError(
    httpStatus.CONFLICT,
    "Could not generate a unique booking number. Please retry.",
  );
};

type TSafeUser = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  phone?: string;
};

const addPopulatedReferences = async <
  T extends TBooking | TBooking[],
>(
  records: T,
): Promise<unknown> => {
  const bookingList = Array.isArray(records) ? records : [records];
  const userIds = [
    ...new Set(bookingList.map((booking) => booking.userId)),
  ];
  const userObjectIds = userIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  // Better Auth owns the user collection; project an explicit safe field list.
  const userDocuments = await client
    .db(process.env.MONGODB_DB)
    .collection("user")
    .find(
      {
        $or: [
          { _id: { $in: [...userIds, ...userObjectIds] } },
          { id: { $in: userIds } },
        ],
      },
      {
        projection: {
          _id: 1,
          id: 1,
          name: 1,
          email: 1,
          image: 1,
          phone: 1,
        },
      },
    )
    .toArray();

  const usersById = new Map<string, TSafeUser>();
  for (const user of userDocuments) {
    const id = String(user.id ?? user._id);
    usersById.set(id, {
      id,
      ...(typeof user.name === "string" ? { name: user.name } : {}),
      ...(typeof user.email === "string"
        ? { email: user.email }
        : {}),
      ...(typeof user.image === "string"
        ? { image: user.image }
        : {}),
      ...(typeof user.phone === "string"
        ? { phone: user.phone }
        : {}),
    });
  }

  const populated = await Promise.all(
    bookingList.map(async (booking) => {
      const service = await Service.findById(
        booking.serviceId,
      ).select("name slug price primaryImage status");
      return {
        ...booking.toObject(),
        userId: usersById.get(booking.userId) ?? {
          id: booking.userId,
        },
        serviceId: service,
      };
    }),
  );

  return Array.isArray(records) ? populated : populated[0];
};

const getBookings = async (
  query: TBookingQuery,
  ownerId?: string,
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (ownerId) filter.userId = ownerId;
  if (query.status) filter.status = query.status;
  if (query.bookingNumber)
    filter.bookingNumber = query.bookingNumber.trim();

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  const data = await addPopulatedReferences(bookings);
  const meta: TPaginationMeta = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };

  return { data, meta };
};

const getMyBookings = (userId: string, query: TBookingQuery) =>
  getBookings(query, userId);

const getAllBookings = (query: TBookingQuery) => getBookings(query);

const getMyBookingById = async (
  userId: string,
  bookingId: string,
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking)
    throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
  if (booking.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You cannot access this booking",
    );
  }
  return addPopulatedReferences(booking);
};

const getBookingById = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);
  if (!booking)
    throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
  return addPopulatedReferences(booking);
};

const updateBookingPrice = async (
  bookingId: string,
  price: number,
) => {
  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { $set: { finalPrice: price } },
    { new: true, runValidators: true },
  );
  if (!booking)
    throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
  return addPopulatedReferences(booking);
};

const updateBookingStatus = async (
  bookingId: string,
  status: TBookingStatus,
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking)
    throw new AppError(httpStatus.NOT_FOUND, "Booking not found");

  const previousStatus = booking.status;
  if (previousStatus === status) {
    return addPopulatedReferences(booking);
  }

  if (!isAllowedBookingStatusTransition(previousStatus, status)) {
    const allowed = getAllowedBookingStatusTransitions(previousStatus);
    const allowedText = allowed.length
      ? allowed.join(", ")
      : "none (terminal state)";
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot transition booking from "${previousStatus}" to "${status}". Allowed next statuses: ${allowedText}.`,
    );
  }

  const updatedBooking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: previousStatus },
    { $set: { status } },
    { new: true, runValidators: true },
  );

  if (!updatedBooking) {
    const latest = await Booking.findById(bookingId);
    if (!latest)
      throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
    if (latest.status === status) {
      return addPopulatedReferences(latest);
    }
    throw new AppError(
      httpStatus.CONFLICT,
      "Booking status was modified concurrently. Please refresh and try again.",
    );
  }

  try {
    if (status === BOOKING_STATUS.CANCELLED) {
      await bookingNotification.notifyBookingCancelled(
        updatedBooking,
        previousStatus,
      );
    } else {
      await bookingNotification.notifyBookingStatusUpdated(
        updatedBooking,
        previousStatus,
      );
    }
  } catch (error) {
    console.error(
      `Failed to send booking status update email for ${updatedBooking.bookingNumber}:`,
      error,
    );
  }

  // Notify customer of booking status transition
  const isCancelled = status === BOOKING_STATUS.CANCELLED;
  void notificationService
    .createNotification({
      recipient: updatedBooking.userId,
      type: isCancelled
        ? NOTIFICATION_TYPE.BOOKING_CANCELLED
        : NOTIFICATION_TYPE.BOOKING_STATUS_CHANGED,
      title: isCancelled
        ? `Booking Cancelled: ${updatedBooking.bookingNumber}`
        : `Booking Status Updated: ${status.toUpperCase()}`,
      message: `Your booking ${updatedBooking.bookingNumber} is now ${status}.`,
      entityType: NOTIFICATION_ENTITY_TYPE.BOOKING,
      entityId: updatedBooking._id.toString(),
      actionUrl: "/dashboard/my-services",
      metadata: {
        bookingNumber: updatedBooking.bookingNumber,
        status,
        previousStatus,
      },
    })
    .catch((err) =>
      console.error("Failed to notify customer of booking update:", err),
    );

  return addPopulatedReferences(updatedBooking);
};

type TBookingManagementUpdate = {
  isSiteVisit?: boolean;
  siteVisitDate?: Date;
  adminNotes?: string;
};

const updateBookingManagement = async (
  bookingId: string,
  changes: TBookingManagementUpdate,
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking)
    throw new AppError(httpStatus.NOT_FOUND, "Booking not found");

  const previousDate = booking.siteVisitDate
    ? new Date(booking.siteVisitDate).toISOString()
    : null;

  if (changes.isSiteVisit !== undefined) {
    booking.isSiteVisit = changes.isSiteVisit;
    if (!changes.isSiteVisit) booking.siteVisitDate = undefined;
  }

  const willHaveSiteVisit =
    changes.isSiteVisit ?? booking.isSiteVisit;
  if (
    changes.siteVisitDate !== undefined &&
    changes.isSiteVisit !== false
  ) {
    if (!willHaveSiteVisit) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Enable site visit before assigning a site visit date",
      );
    }
    booking.siteVisitDate = changes.siteVisitDate;
  }

  if (changes.adminNotes !== undefined)
    booking.adminNotes = changes.adminNotes;

  await booking.save();

  if (changes.siteVisitDate !== undefined && changes.isSiteVisit !== false) {
    const isRescheduled = Boolean(
      previousDate &&
        previousDate !== new Date(changes.siteVisitDate).toISOString(),
    );

    void notificationService
      .createNotification({
        recipient: booking.userId,
        type: NOTIFICATION_TYPE.SITE_VISIT_SCHEDULED,
        title: isRescheduled
          ? "Site Visit Rescheduled"
          : "Site Visit Scheduled",
        message: isRescheduled
          ? `A site visit for booking ${booking.bookingNumber} has been rescheduled to ${new Date(changes.siteVisitDate).toLocaleDateString()}.`
          : `A site visit for booking ${booking.bookingNumber} has been scheduled for ${new Date(changes.siteVisitDate).toLocaleDateString()}.`,
        entityType: NOTIFICATION_ENTITY_TYPE.BOOKING,
        entityId: booking._id.toString(),
        actionUrl: "/dashboard/my-services",
        metadata: {
          bookingNumber: booking.bookingNumber,
          siteVisitDate: changes.siteVisitDate,
          previousDate,
          isRescheduled,
        },
      })
      .catch((err) =>
        console.error("Failed to notify customer of site visit date:", err),
      );
  } else if (previousDate && changes.isSiteVisit === false) {
    void notificationService
      .createNotification({
        recipient: booking.userId,
        type: NOTIFICATION_TYPE.SITE_VISIT_SCHEDULED,
        title: "Site Visit Cancelled",
        message: `The scheduled site visit for booking ${booking.bookingNumber} has been cancelled.`,
        entityType: NOTIFICATION_ENTITY_TYPE.BOOKING,
        entityId: booking._id.toString(),
        actionUrl: "/dashboard/my-services",
        metadata: {
          bookingNumber: booking.bookingNumber,
          previousDate,
        },
      })
      .catch((err) =>
        console.error("Failed to notify customer of site visit cancellation:", err),
      );
  }

  return addPopulatedReferences(booking);
};

const cancelBooking = async (
  bookingId: string,
  actor: { id: string; role: "user" | "admin" },
) => {
  const allowedStatuses: TBookingStatus[] =
    actor.role === "admin"
      ? [
          BOOKING_STATUS.PENDING,
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.IN_PROGRESS,
        ]
      : [BOOKING_STATUS.PENDING];

  const filter: Record<string, unknown> = {
    _id: bookingId,
    status: { $in: allowedStatuses },
  };
  if (actor.role === "user") filter.userId = actor.id;

  const existingBooking = await Booking.findOne(filter);

  if (!existingBooking) {
    const bookingInDb = await Booking.findById(bookingId);
    if (!bookingInDb) {
      throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
    }
    if (
      actor.role === "user" &&
      bookingInDb.userId !== actor.id
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You cannot cancel this booking",
      );
    }
    if (bookingInDb.status === BOOKING_STATUS.CANCELLED) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Booking has already been cancelled",
      );
    }
    throw new AppError(
      httpStatus.CONFLICT,
      actor.role === "admin"
        ? "This booking can no longer be cancelled"
        : "You can only cancel pending bookings",
    );
  }

  const previousStatus = existingBooking.status;
  existingBooking.status = BOOKING_STATUS.CANCELLED;
  await existingBooking.save();

  try {
    await bookingNotification.notifyBookingCancelled(
      existingBooking,
      previousStatus,
    );
  } catch (error) {
    console.error(
      `Failed to send cancellation email for ${existingBooking.bookingNumber}:`,
      error,
    );
  }

  if (actor.role === "user") {
    void notificationService
      .notifyAdmins({
        type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
        title: "Booking Cancelled by Customer",
        message: `Customer cancelled booking ${existingBooking.bookingNumber}.`,
        entityType: NOTIFICATION_ENTITY_TYPE.BOOKING,
        entityId: existingBooking._id.toString(),
        actionUrl: "/dashboard/service-bookings",
        metadata: {
          bookingNumber: existingBooking.bookingNumber,
          userId: existingBooking.userId,
        },
      })
      .catch((err) =>
        console.error("Failed to notify admins of customer cancellation:", err),
      );
  } else {
    void notificationService
      .createNotification({
        recipient: existingBooking.userId,
        type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
        title: `Booking Cancelled: ${existingBooking.bookingNumber}`,
        message: `Your booking ${existingBooking.bookingNumber} was cancelled by administrator.`,
        entityType: NOTIFICATION_ENTITY_TYPE.BOOKING,
        entityId: existingBooking._id.toString(),
        actionUrl: "/dashboard/my-services",
        metadata: {
          bookingNumber: existingBooking.bookingNumber,
          status: BOOKING_STATUS.CANCELLED,
        },
      })
      .catch((err) =>
        console.error("Failed to notify customer of booking cancellation:", err),
      );
  }

  return addPopulatedReferences(existingBooking);
};

export const bookingService = {
  createBooking,
  getMyBookings,
  getAllBookings,
  getMyBookingById,
  getBookingById,
  updateBookingPrice,
  updateBookingStatus,
  updateBookingManagement,
  cancelBooking,
};
