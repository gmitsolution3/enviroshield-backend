export const NOTIFICATION_TYPE = {
  ORDER_CREATED: "order.created",
  ORDER_STATUS_CHANGED: "order.status_changed",
  ORDER_PAYMENT_CONFIRMED: "order.payment_confirmed",
  ORDER_CANCELLED: "order.cancelled",

  BOOKING_CREATED: "booking.created",
  BOOKING_STATUS_CHANGED: "booking.status_changed",
  BOOKING_CANCELLED: "booking.cancelled",

  CONTACT_CREATED: "contact.created",
  CONTACT_STATUS_CHANGED: "contact.status_changed",
  SITE_VISIT_SCHEDULED: "site_visit.scheduled",

  INVENTORY_LOW_STOCK: "inventory.low_stock",
  INVENTORY_OUT_OF_STOCK: "inventory.out_of_stock",
} as const;

export type TNotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_ENTITY_TYPE = {
  ORDER: "order",
  BOOKING: "booking",
  CONTACT: "contact",
  PRODUCT: "product",
  INVENTORY: "inventory",
} as const;

export type TNotificationEntityType =
  (typeof NOTIFICATION_ENTITY_TYPE)[keyof typeof NOTIFICATION_ENTITY_TYPE];

