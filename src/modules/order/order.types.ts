
import { Types } from "mongoose";
import {
  DELIVERY_ZONE,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from "./order.constant";

export type TOrderStatus =
  (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export type TPaymentMethod =
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export type TPaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export type TDeliveryZone =
  (typeof DELIVERY_ZONE)[keyof typeof DELIVERY_ZONE];

export type TOrderItem = {
  productId: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  primaryImage: {
    url: string;
    publicId: string;
    alt: string;
  };
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type TOrder = {
  orderNumber: string;
  userId: string;
  items: TOrderItem[];

  customer: {
    name: string;
    phone: string;
    email: string;
  };

  deliveryAddress: {
    addressLine: string;
    area: string;
    city: string;
    district: string;
    postalCode?: string;
  };

  deliveryZone: TDeliveryZone;
  deliveryFee: number;
  subtotal: number;
  totalAmount: number;
  currency: "BDT";

  paymentMethod: TPaymentMethod;
  paymentStatus: TPaymentStatus;
  status: TOrderStatus;

  customerNote?: string;
  cancellationReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
};