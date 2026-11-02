export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
} as const;

export const BOOKING_STATUSES = Object.values(BOOKING_STATUS);

export type TBookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_STATUS_TRANSITIONS: Record<
  TBookingStatus,
  readonly TBookingStatus[]
> = {
  [BOOKING_STATUS.PENDING]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.REJECTED,
  ],
  [BOOKING_STATUS.CONFIRMED]: [
    BOOKING_STATUS.IN_PROGRESS,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.IN_PROGRESS]: [
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.COMPLETED]: [],
  [BOOKING_STATUS.CANCELLED]: [],
  [BOOKING_STATUS.REJECTED]: [],
} as const;

export const getAllowedBookingStatusTransitions = (
  currentStatus: TBookingStatus,
): readonly TBookingStatus[] => {
  return BOOKING_STATUS_TRANSITIONS[currentStatus] ?? [];
};

export const isAllowedBookingStatusTransition = (
  currentStatus: TBookingStatus,
  nextStatus: TBookingStatus,
): boolean => {
  const allowed = getAllowedBookingStatusTransitions(currentStatus);
  return (allowed as readonly string[]).includes(nextStatus);
};
