export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type TOrderStatus =
  (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_TRANSITIONS: Record<
  TOrderStatus,
  readonly TOrderStatus[]
> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
} as const;

export const getAllowedOrderStatusTransitions = (
  currentStatus: TOrderStatus,
): readonly TOrderStatus[] => {
  return ORDER_STATUS_TRANSITIONS[currentStatus] ?? [];
};

export const isAllowedOrderStatusTransition = (
  currentStatus: TOrderStatus,
  nextStatus: TOrderStatus,
): boolean => {
  const allowed = getAllowedOrderStatusTransitions(currentStatus);
  return (allowed as readonly string[]).includes(nextStatus);
};

export const PAYMENT_METHOD = {
  COD: "cod",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export type TPaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_TRANSITIONS: Record<
  TPaymentStatus,
  readonly TPaymentStatus[]
> = {
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAID]: [PAYMENT_STATUS.REFUNDED],
  [PAYMENT_STATUS.FAILED]: [],
  [PAYMENT_STATUS.REFUNDED]: [],
} as const;

export const getAllowedPaymentStatusTransitions = (
  currentStatus: TPaymentStatus,
): readonly TPaymentStatus[] => {
  return PAYMENT_STATUS_TRANSITIONS[currentStatus] ?? [];
};

export const isAllowedPaymentStatusTransition = (
  currentStatus: TPaymentStatus,
  nextStatus: TPaymentStatus,
): boolean => {
  const allowed = getAllowedPaymentStatusTransitions(currentStatus);
  return (allowed as readonly string[]).includes(nextStatus);
};

export const DELIVERY_ZONE = {
  DHAKA: "dhaka",
  OUTSIDE_DHAKA: "outside_dhaka",
} as const;
