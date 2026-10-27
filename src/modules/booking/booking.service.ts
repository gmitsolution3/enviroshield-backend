import { randomBytes } from "crypto";
import httpStatus from "http-status";
import { ObjectId } from "mongodb";
import { Types } from "mongoose";
import { client } from "../../config/mongodb";
import { TPaginationMeta } from "../../types/common";
import { AppError } from "../../utils/AppError";
import Service from "../service/service.model";
import { BOOKING_STATUS } from "./booking.constant";
import Booking from "./booking.model";
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
    "_id price",
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
      return await Booking.create({
        bookingNumber: generateBookingNumber(),
        userId,
        serviceId: service._id,
        project: payload.project,
        isSiteVisit: payload.isSiteVisit ?? false,
        finalPrice: service.price,
        status: BOOKING_STATUS.PENDING,
      });
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
  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { $set: { status } },
    { new: true, runValidators: true },
  );
  if (!booking)
    throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
  return addPopulatedReferences(booking);
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

  const booking = await Booking.findOneAndUpdate(
    filter,
    { $set: { status: BOOKING_STATUS.CANCELLED } },
    { new: true, runValidators: true },
  );

  if (!booking) {
    const existingBooking = await Booking.findById(bookingId);
    if (!existingBooking) {
      throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
    }
    if (
      actor.role === "user" &&
      existingBooking.userId !== actor.id
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You cannot cancel this booking",
      );
    }
    if (existingBooking.status === BOOKING_STATUS.CANCELLED) {
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

  return addPopulatedReferences(booking);
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
