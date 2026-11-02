import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../../utils/AppError";
import Booking from "../booking/booking.model";
import { bookingService } from "../booking/booking.service";
import Contact from "../contact/contact.model";
import { contactService } from "../contact/contact.service";
import Order from "../order/order.model";
import { orderService } from "../order/order.service";

describe("Service Layer Status Transition Enforcement", () => {
  describe("Booking Service", () => {
    it("rejects backward transition with informative error", async () => {
      const originalFindById = Booking.findById;
      try {
        Booking.findById = (() => ({
          status: "in-progress",
          bookingNumber: "BK-1001",
        })) as any;

        await assert.rejects(
          async () => {
            await bookingService.updateBookingStatus(
              "507f1f77bcf86cd799439011",
              "pending",
            );
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 400);
            assert(
              err.message.includes(
                'Cannot transition booking from "in-progress" to "pending"',
              ),
            );
            assert(
              err.message.includes("Allowed next statuses: completed, cancelled"),
            );
            return true;
          },
        );
      } finally {
        Booking.findById = originalFindById;
      }
    });

    it("rejects transition from terminal state", async () => {
      const originalFindById = Booking.findById;
      try {
        Booking.findById = (() => ({
          status: "completed",
          bookingNumber: "BK-1003",
        })) as any;

        await assert.rejects(
          async () => {
            await bookingService.updateBookingStatus(
              "507f1f77bcf86cd799439011",
              "in-progress",
            );
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 400);
            assert(
              err.message.includes(
                'Cannot transition booking from "completed" to "in-progress"',
              ),
            );
            assert(err.message.includes("none (terminal state)"));
            return true;
          },
        );
      } finally {
        Booking.findById = originalFindById;
      }
    });
  });

  describe("Order Status Service", () => {
    it("handles idempotent same-status request cleanly without updating", async () => {
      const originalFindById = Order.findById;
      try {
        Order.findById = (() => ({
          status: "confirmed",
          orderNumber: "ORD-1000",
        })) as any;

        const result = await orderService.updateOrderStatus(
          "507f1f77bcf86cd799439011",
          "confirmed",
        );
        assert.equal(result.status, "confirmed");
      } finally {
        Order.findById = originalFindById;
      }
    });

    it("rejects backward transition from shipped to processing", async () => {
      const originalFindById = Order.findById;
      try {
        Order.findById = (() => ({
          status: "shipped",
          orderNumber: "ORD-1001",
        })) as any;

        await assert.rejects(
          async () => {
            await orderService.updateOrderStatus(
              "507f1f77bcf86cd799439011",
              "processing",
            );
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 400);
            assert(
              err.message.includes(
                'Cannot transition order from "shipped" to "processing"',
              ),
            );
            assert(err.message.includes("Allowed next statuses: delivered"));
            return true;
          },
        );
      } finally {
        Order.findById = originalFindById;
      }
    });

    it("rejects transition from delivered terminal state", async () => {
      const originalFindById = Order.findById;
      try {
        Order.findById = (() => ({
          status: "delivered",
          orderNumber: "ORD-1002",
        })) as any;

        await assert.rejects(
          async () => {
            await orderService.updateOrderStatus(
              "507f1f77bcf86cd799439011",
              "shipped",
            );
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 400);
            assert(
              err.message.includes(
                'Cannot transition order from "delivered" to "shipped"',
              ),
            );
            assert(err.message.includes("none (terminal state)"));
            return true;
          },
        );
      } finally {
        Order.findById = originalFindById;
      }
    });
  });

  describe("Order Payment Status Service", () => {
    it("handles idempotent same-payment-status request cleanly", async () => {
      const originalFindById = Order.findById;
      try {
        Order.findById = (() => ({
          paymentStatus: "paid",
          orderNumber: "ORD-1000",
          paymentMethod: "cod",
          status: "confirmed",
        })) as any;

        const result = await orderService.updatePaymentStatus(
          "507f1f77bcf86cd799439011",
          "paid",
        );
        assert.equal(result.paymentStatus, "paid");
      } finally {
        Order.findById = originalFindById;
      }
    });

    it("rejects transition from failed to paid", async () => {
      const originalFindById = Order.findById;
      try {
        Order.findById = (() => ({
          paymentStatus: "failed",
          orderNumber: "ORD-1003",
          paymentMethod: "cod",
          status: "pending",
        })) as any;

        await assert.rejects(
          async () => {
            await orderService.updatePaymentStatus(
              "507f1f77bcf86cd799439011",
              "paid",
            );
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 400);
            assert(
              err.message.includes(
                'Cannot transition payment status from "failed" to "paid"',
              ),
            );
            assert(err.message.includes("none (terminal state)"));
            return true;
          },
        );
      } finally {
        Order.findById = originalFindById;
      }
    });

    it("rejects transition from paid back to pending", async () => {
      const originalFindById = Order.findById;
      try {
        Order.findById = (() => ({
          paymentStatus: "paid",
          orderNumber: "ORD-1004",
          paymentMethod: "cod",
          status: "confirmed",
        })) as any;

        await assert.rejects(
          async () => {
            await orderService.updatePaymentStatus(
              "507f1f77bcf86cd799439011",
              "pending",
            );
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 400);
            assert(
              err.message.includes(
                'Cannot transition payment status from "paid" to "pending"',
              ),
            );
            assert(err.message.includes("Allowed next statuses: refunded"));
            return true;
          },
        );
      } finally {
        Order.findById = originalFindById;
      }
    });
  });

  describe("Contact Service", () => {
    it("rejects skipping transition from new directly to won", async () => {
      const originalFindById = Contact.findById;
      try {
        Contact.findById = (() => ({
          status: "new",
          fullName: "John Doe",
        })) as any;

        await assert.rejects(
          async () => {
            await contactService.updateContact("507f1f77bcf86cd799439011", {
              status: "won",
            });
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 400);
            assert(
              err.message.includes(
                'Cannot transition contact inquiry from "new" to "won"',
              ),
            );
            assert(err.message.includes("Allowed next statuses: contacted"));
            return true;
          },
        );
      } finally {
        Contact.findById = originalFindById;
      }
    });

    it("rejects transition from terminal won state", async () => {
      const originalFindById = Contact.findById;
      try {
        Contact.findById = (() => ({
          status: "won",
          fullName: "Jane Doe",
        })) as any;

        await assert.rejects(
          async () => {
            await contactService.updateContact("507f1f77bcf86cd799439011", {
              status: "lost",
            });
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 400);
            assert(
              err.message.includes(
                'Cannot transition contact inquiry from "won" to "lost"',
              ),
            );
            assert(err.message.includes("none (terminal state)"));
            return true;
          },
        );
      } finally {
        Contact.findById = originalFindById;
      }
    });
  });
});
