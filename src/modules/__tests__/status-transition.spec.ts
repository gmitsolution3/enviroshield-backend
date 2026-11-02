import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BOOKING_STATUS,
  BOOKING_STATUS_TRANSITIONS,
  getAllowedBookingStatusTransitions,
  isAllowedBookingStatusTransition,
  type TBookingStatus,
} from "../booking/booking.constant";

import {
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_TRANSITIONS,
  getAllowedOrderStatusTransitions,
  getAllowedPaymentStatusTransitions,
  isAllowedOrderStatusTransition,
  isAllowedPaymentStatusTransition,
  type TOrderStatus,
  type TPaymentStatus,
} from "../order/order.constant";

import {
  CONTACT_STATUS,
  CONTACT_STATUS_TRANSITIONS,
  getAllowedContactStatusTransitions,
  isAllowedContactStatusTransition,
  type TContactStatus,
} from "../contact/contact.constant";

describe("Strict Status Transition Pipelines", () => {
  describe("1. Booking Status Transitions", () => {
    it("allows valid transitions from pending", () => {
      assert.deepEqual(
        getAllowedBookingStatusTransitions(BOOKING_STATUS.PENDING),
        [
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.CANCELLED,
          BOOKING_STATUS.REJECTED,
        ],
      );
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.PENDING,
          BOOKING_STATUS.CONFIRMED,
        ),
        true,
      );
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.PENDING,
          BOOKING_STATUS.CANCELLED,
        ),
        true,
      );
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.PENDING,
          BOOKING_STATUS.REJECTED,
        ),
        true,
      );
    });

    it("allows valid transitions from confirmed", () => {
      assert.deepEqual(
        getAllowedBookingStatusTransitions(BOOKING_STATUS.CONFIRMED),
        [BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.CANCELLED],
      );
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.IN_PROGRESS,
        ),
        true,
      );
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.CANCELLED,
        ),
        true,
      );
    });

    it("allows valid transitions from in-progress", () => {
      assert.deepEqual(
        getAllowedBookingStatusTransitions(BOOKING_STATUS.IN_PROGRESS),
        [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED],
      );
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.COMPLETED,
        ),
        true,
      );
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.CANCELLED,
        ),
        true,
      );
    });

    it("enforces terminal states (completed, cancelled, rejected)", () => {
      assert.deepEqual(
        getAllowedBookingStatusTransitions(BOOKING_STATUS.COMPLETED),
        [],
      );
      assert.deepEqual(
        getAllowedBookingStatusTransitions(BOOKING_STATUS.CANCELLED),
        [],
      );
      assert.deepEqual(
        getAllowedBookingStatusTransitions(BOOKING_STATUS.REJECTED),
        [],
      );

      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.COMPLETED,
          BOOKING_STATUS.PENDING,
        ),
        false,
      );
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.CANCELLED,
          BOOKING_STATUS.CONFIRMED,
        ),
        false,
      );
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.REJECTED,
          BOOKING_STATUS.IN_PROGRESS,
        ),
        false,
      );
    });

    it("rejects invalid and backward transitions", () => {
      // confirmed -> pending
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.PENDING,
        ),
        false,
      );
      // in-progress -> confirmed
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.CONFIRMED,
        ),
        false,
      );
      // in-progress -> pending
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.PENDING,
        ),
        false,
      );
      // pending -> completed (skipping intermediate)
      assert.equal(
        isAllowedBookingStatusTransition(
          BOOKING_STATUS.PENDING,
          BOOKING_STATUS.COMPLETED,
        ),
        false,
      );
    });
  });

  describe("2. Order Status Transitions", () => {
    it("allows valid transitions according to workflow", () => {
      assert.deepEqual(
        getAllowedOrderStatusTransitions(ORDER_STATUS.PENDING),
        [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      );
      assert.deepEqual(
        getAllowedOrderStatusTransitions(ORDER_STATUS.CONFIRMED),
        [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
      );
      assert.deepEqual(
        getAllowedOrderStatusTransitions(ORDER_STATUS.PROCESSING),
        [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
      );
      assert.deepEqual(
        getAllowedOrderStatusTransitions(ORDER_STATUS.SHIPPED),
        [ORDER_STATUS.DELIVERED],
      );
    });

    it("enforces terminal states (delivered, cancelled)", () => {
      assert.deepEqual(
        getAllowedOrderStatusTransitions(ORDER_STATUS.DELIVERED),
        [],
      );
      assert.deepEqual(
        getAllowedOrderStatusTransitions(ORDER_STATUS.CANCELLED),
        [],
      );

      assert.equal(
        isAllowedOrderStatusTransition(
          ORDER_STATUS.DELIVERED,
          ORDER_STATUS.PROCESSING,
        ),
        false,
      );
      assert.equal(
        isAllowedOrderStatusTransition(
          ORDER_STATUS.CANCELLED,
          ORDER_STATUS.PENDING,
        ),
        false,
      );
    });

    it("prohibits backward transitions and skipping steps", () => {
      // shipped cannot be cancelled or moved back
      assert.equal(
        isAllowedOrderStatusTransition(
          ORDER_STATUS.SHIPPED,
          ORDER_STATUS.CANCELLED,
        ),
        false,
      );
      assert.equal(
        isAllowedOrderStatusTransition(
          ORDER_STATUS.SHIPPED,
          ORDER_STATUS.PROCESSING,
        ),
        false,
      );
      assert.equal(
        isAllowedOrderStatusTransition(
          ORDER_STATUS.SHIPPED,
          ORDER_STATUS.PENDING,
        ),
        false,
      );

      // processing cannot move back to confirmed or pending
      assert.equal(
        isAllowedOrderStatusTransition(
          ORDER_STATUS.PROCESSING,
          ORDER_STATUS.CONFIRMED,
        ),
        false,
      );
      assert.equal(
        isAllowedOrderStatusTransition(
          ORDER_STATUS.PROCESSING,
          ORDER_STATUS.PENDING,
        ),
        false,
      );
    });
  });

  describe("3. Order Payment Status Transitions", () => {
    it("allows pending to become paid or failed", () => {
      assert.deepEqual(
        getAllowedPaymentStatusTransitions(PAYMENT_STATUS.PENDING),
        [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
      );
      assert.equal(
        isAllowedPaymentStatusTransition(
          PAYMENT_STATUS.PENDING,
          PAYMENT_STATUS.PAID,
        ),
        true,
      );
      assert.equal(
        isAllowedPaymentStatusTransition(
          PAYMENT_STATUS.PENDING,
          PAYMENT_STATUS.FAILED,
        ),
        true,
      );
    });

    it("allows paid to become refunded", () => {
      assert.deepEqual(
        getAllowedPaymentStatusTransitions(PAYMENT_STATUS.PAID),
        [PAYMENT_STATUS.REFUNDED],
      );
      assert.equal(
        isAllowedPaymentStatusTransition(
          PAYMENT_STATUS.PAID,
          PAYMENT_STATUS.REFUNDED,
        ),
        true,
      );
    });

    it("enforces failed and refunded as terminal states", () => {
      assert.deepEqual(
        getAllowedPaymentStatusTransitions(PAYMENT_STATUS.FAILED),
        [],
      );
      assert.deepEqual(
        getAllowedPaymentStatusTransitions(PAYMENT_STATUS.REFUNDED),
        [],
      );

      // failed cannot transition to paid or pending
      assert.equal(
        isAllowedPaymentStatusTransition(
          PAYMENT_STATUS.FAILED,
          PAYMENT_STATUS.PAID,
        ),
        false,
      );
      assert.equal(
        isAllowedPaymentStatusTransition(
          PAYMENT_STATUS.FAILED,
          PAYMENT_STATUS.PENDING,
        ),
        false,
      );

      // refunded cannot transition to paid or pending
      assert.equal(
        isAllowedPaymentStatusTransition(
          PAYMENT_STATUS.REFUNDED,
          PAYMENT_STATUS.PAID,
        ),
        false,
      );
      assert.equal(
        isAllowedPaymentStatusTransition(
          PAYMENT_STATUS.REFUNDED,
          PAYMENT_STATUS.PENDING,
        ),
        false,
      );

      // paid cannot return to pending
      assert.equal(
        isAllowedPaymentStatusTransition(
          PAYMENT_STATUS.PAID,
          PAYMENT_STATUS.PENDING,
        ),
        false,
      );
    });
  });

  describe("4. Contact / Inquiry Status Transitions", () => {
    it("allows new to become contacted", () => {
      assert.deepEqual(
        getAllowedContactStatusTransitions(CONTACT_STATUS.NEW),
        [CONTACT_STATUS.CONTACTED],
      );
      assert.equal(
        isAllowedContactStatusTransition(
          CONTACT_STATUS.NEW,
          CONTACT_STATUS.CONTACTED,
        ),
        true,
      );
      assert.equal(
        isAllowedContactStatusTransition(
          CONTACT_STATUS.NEW,
          CONTACT_STATUS.QUALIFIED,
        ),
        false,
      );
    });

    it("allows contacted to become qualified or lost", () => {
      assert.deepEqual(
        getAllowedContactStatusTransitions(CONTACT_STATUS.CONTACTED),
        [CONTACT_STATUS.QUALIFIED, CONTACT_STATUS.LOST],
      );
      assert.equal(
        isAllowedContactStatusTransition(
          CONTACT_STATUS.CONTACTED,
          CONTACT_STATUS.QUALIFIED,
        ),
        true,
      );
      assert.equal(
        isAllowedContactStatusTransition(
          CONTACT_STATUS.CONTACTED,
          CONTACT_STATUS.LOST,
        ),
        true,
      );
    });

    it("allows qualified to become site-visit, proposal-sent, or lost", () => {
      assert.deepEqual(
        getAllowedContactStatusTransitions(CONTACT_STATUS.QUALIFIED),
        [
          CONTACT_STATUS.SITE_VISIT,
          CONTACT_STATUS.PROPOSAL_SENT,
          CONTACT_STATUS.LOST,
        ],
      );
    });

    it("allows site-visit to become proposal-sent or lost", () => {
      assert.deepEqual(
        getAllowedContactStatusTransitions(CONTACT_STATUS.SITE_VISIT),
        [CONTACT_STATUS.PROPOSAL_SENT, CONTACT_STATUS.LOST],
      );
    });

    it("allows proposal-sent to become won or lost", () => {
      assert.deepEqual(
        getAllowedContactStatusTransitions(CONTACT_STATUS.PROPOSAL_SENT),
        [CONTACT_STATUS.WON, CONTACT_STATUS.LOST],
      );
    });

    it("enforces won and lost as terminal states", () => {
      assert.deepEqual(
        getAllowedContactStatusTransitions(CONTACT_STATUS.WON),
        [],
      );
      assert.deepEqual(
        getAllowedContactStatusTransitions(CONTACT_STATUS.LOST),
        [],
      );

      // won cannot move back
      assert.equal(
        isAllowedContactStatusTransition(
          CONTACT_STATUS.WON,
          CONTACT_STATUS.NEW,
        ),
        false,
      );
      assert.equal(
        isAllowedContactStatusTransition(
          CONTACT_STATUS.WON,
          CONTACT_STATUS.PROPOSAL_SENT,
        ),
        false,
      );

      // lost cannot move back
      assert.equal(
        isAllowedContactStatusTransition(
          CONTACT_STATUS.LOST,
          CONTACT_STATUS.QUALIFIED,
        ),
        false,
      );
      assert.equal(
        isAllowedContactStatusTransition(
          CONTACT_STATUS.LOST,
          CONTACT_STATUS.WON,
        ),
        false,
      );
    });
  });
});

