import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../../utils/AppError";
import {
  NOTIFICATION_ENTITY_TYPE,
  NOTIFICATION_TYPE,
} from "../notification/notification.constant";
import Notification from "../notification/notification.model";
import { notificationService } from "../notification/notification.service";
import { client } from "../../config/mongodb";

const VALID_ID_1 = "507f1f77bcf86cd799439011";
const VALID_ID_2 = "507f1f77bcf86cd799439012";

describe("Notification System Unit & Service Tests", () => {
  describe("createNotification", () => {
    it("creates a notification successfully", async () => {
      const originalCreate = Notification.create;
      try {
        Notification.create = (async (doc: any) => {
          return {
            _id: VALID_ID_1,
            ...doc,
            createdAt: new Date(),
          };
        }) as any;

        const result = await notificationService.createNotification({
          recipient: "user-1",
          type: NOTIFICATION_TYPE.ORDER_CREATED,
          title: "New Order",
          message: "Order ES-1001 placed successfully",
          entityType: NOTIFICATION_ENTITY_TYPE.ORDER,
          entityId: "order-1",
          actionUrl: "/dashboard/my-orders",
          metadata: { orderNumber: "ES-1001" },
        });

        assert.equal(result.recipient, "user-1");
        assert.equal(result.title, "New Order");
        assert.equal(result.type, NOTIFICATION_TYPE.ORDER_CREATED);
        assert.equal(result.actionUrl, "/dashboard/my-orders");
      } finally {
        Notification.create = originalCreate;
      }
    });

    it("idempotently ignores duplicates when idempotencyKey already exists", async () => {
      const originalFindOne = Notification.findOne;
      const originalCreate = Notification.create;
      let createCalled = false;

      try {
        Notification.findOne = (async (filter: any) => {
          if (filter?.["metadata.idempotencyKey"] === "idem-key-1") {
            return {
              _id: VALID_ID_1,
              recipient: "user-1",
              metadata: { idempotencyKey: "idem-key-1" },
            };
          }
          return null;
        }) as any;

        Notification.create = (async () => {
          createCalled = true;
          return {};
        }) as any;

        const result = await notificationService.createNotification({
          recipient: "user-1",
          type: NOTIFICATION_TYPE.ORDER_STATUS_CHANGED,
          title: "Order Confirmed",
          message: "Your order is confirmed",
          metadata: { idempotencyKey: "idem-key-1" },
        });

        assert.equal(result._id, VALID_ID_1);
        assert.equal(createCalled, false);
      } finally {
        Notification.findOne = originalFindOne;
        Notification.create = originalCreate;
      }
    });
  });

  describe("getUnreadCount", () => {
    it("returns unread count scoped strictly to the requesting recipient", async () => {
      const originalCountDocuments = Notification.countDocuments;
      let capturedFilter: any = null;

      try {
        Notification.countDocuments = (async (filter: any) => {
          capturedFilter = filter;
          return 5;
        }) as any;

        const result = await notificationService.getUnreadCount("user-alice");

        assert.equal(result.unreadCount, 5);
        assert.equal(capturedFilter.recipient, "user-alice");
        assert.equal(capturedFilter.isRead, false);
      } finally {
        Notification.countDocuments = originalCountDocuments;
      }
    });
  });

  describe("getNotifications", () => {
    it("returns paginated notifications and unreadCount", async () => {
      const originalFind = Notification.find;
      const originalCountDocuments = Notification.countDocuments;

      try {
        const mockData = [
          { _id: VALID_ID_1, title: "N1", isRead: false },
          { _id: VALID_ID_2, title: "N2", isRead: true },
        ];

        Notification.find = (() => ({
          sort: () => ({
            skip: () => ({
              limit: async () => mockData,
            }),
          }),
        })) as any;

        Notification.countDocuments = (async (filter: any) => {
          if (filter.isRead === false) return 1;
          return 2;
        }) as any;

        const result = await notificationService.getNotifications("user-1", {
          page: "1",
          limit: "10",
        });

        assert.equal(result.data.length, 2);
        assert.equal(result.meta.unreadCount, 1);
        assert.equal(result.meta.total, 2);
        assert.equal(result.meta.page, 1);
      } finally {
        Notification.find = originalFind;
        Notification.countDocuments = originalCountDocuments;
      }
    });

    it("applies unreadOnly filter when requested", async () => {
      const originalFind = Notification.find;
      const originalCountDocuments = Notification.countDocuments;
      let capturedFilter: any = null;

      try {
        Notification.find = ((filter: any) => {
          capturedFilter = filter;
          return {
            sort: () => ({
              skip: () => ({
                limit: async () => [],
              }),
            }),
          };
        }) as any;

        Notification.countDocuments = (async () => 0) as any;

        await notificationService.getNotifications("user-1", {
          unreadOnly: "true",
        });

        assert.equal(capturedFilter.recipient, "user-1");
        assert.equal(capturedFilter.isRead, false);
      } finally {
        Notification.find = originalFind;
        Notification.countDocuments = originalCountDocuments;
      }
    });
  });

  describe("markAsRead", () => {
    it("marks notification as read scoped to recipient", async () => {
      const originalFindOne = Notification.findOne;
      let capturedFilter: any = null;

      try {
        Notification.findOne = (async (filter: any) => {
          capturedFilter = filter;
          return {
            _id: filter._id,
            recipient: filter.recipient,
            isRead: false,
            readAt: null,
            save: async function () {
              return this;
            },
          };
        }) as any;

        const result = await notificationService.markAsRead(
          VALID_ID_1,
          "user-1",
        );

        assert.equal(result.isRead, true);
        assert.equal(capturedFilter._id, VALID_ID_1);
        assert.equal(capturedFilter.recipient, "user-1");
      } finally {
        Notification.findOne = originalFindOne;
      }
    });

    it("throws 404 when notification does not belong to recipient", async () => {
      const originalFindOne = Notification.findOne;

      try {
        Notification.findOne = (async () => null) as any;

        await assert.rejects(
          async () => {
            await notificationService.markAsRead(VALID_ID_2, "user-attacker");
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 404);
            assert.equal(err.message, "Notification not found");
            return true;
          },
        );
      } finally {
        Notification.findOne = originalFindOne;
      }
    });

    it("throws 404 for invalid ObjectId format", async () => {
      await assert.rejects(
        async () => {
          await notificationService.markAsRead("invalid-id", "user-1");
        },
        (err: any) => {
          assert(err instanceof AppError);
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });
  });

  describe("markAllAsRead", () => {
    it("updates all unread notifications for recipient", async () => {
      const originalUpdateMany = Notification.updateMany;
      let capturedFilter: any = null;

      try {
        Notification.updateMany = (async (filter: any) => {
          capturedFilter = filter;
          return { modifiedCount: 4 };
        }) as any;

        const result = await notificationService.markAllAsRead("user-1");

        assert.equal(result.modifiedCount, 4);
        assert.equal(capturedFilter.recipient, "user-1");
        assert.equal(capturedFilter.isRead, false);
      } finally {
        Notification.updateMany = originalUpdateMany;
      }
    });
  });

  describe("deleteNotification", () => {
    it("deletes notification scoped to recipient", async () => {
      const originalFindOneAndDelete = Notification.findOneAndDelete;
      let capturedFilter: any = null;

      try {
        Notification.findOneAndDelete = (async (filter: any) => {
          capturedFilter = filter;
          return { _id: filter._id, recipient: "user-1" };
        }) as any;

        const result = await notificationService.deleteNotification(
          VALID_ID_1,
          "user-1",
        );

        assert.equal(result.success, true);
        assert.equal(capturedFilter._id, VALID_ID_1);
        assert.equal(capturedFilter.recipient, "user-1");
      } finally {
        Notification.findOneAndDelete = originalFindOneAndDelete;
      }
    });

    it("throws 404 if notification to delete belongs to another user", async () => {
      const originalFindOneAndDelete = Notification.findOneAndDelete;

      try {
        Notification.findOneAndDelete = (async () => null) as any;

        await assert.rejects(
          async () => {
            await notificationService.deleteNotification(
              VALID_ID_2,
              "user-intruder",
            );
          },
          (err: any) => {
            assert(err instanceof AppError);
            assert.equal(err.statusCode, 404);
            return true;
          },
        );
      } finally {
        Notification.findOneAndDelete = originalFindOneAndDelete;
      }
    });
  });

  describe("notifyAdmins", () => {
    it("broadcasts notification to all registered admin accounts", async () => {
      const originalDb = client.db;
      const createdNotifications: any[] = [];
      const originalCreate = Notification.create;

      try {
        client.db = (() => ({
          collection: () => ({
            find: () => ({
              toArray: async () => [
                { id: "admin-1", email: "admin1@test.com" },
                { _id: { toString: () => "admin-2" }, email: "admin2@test.com" },
              ],
            }),
          }),
        })) as any;

        Notification.create = (async (doc: any) => {
          createdNotifications.push(doc);
          return doc;
        }) as any;

        await notificationService.notifyAdmins({
          type: NOTIFICATION_TYPE.BOOKING_CREATED,
          title: "New Booking Alert",
          message: "New booking BK-999 received",
          actionUrl: "/dashboard/service-bookings",
        });

        assert.equal(createdNotifications.length, 2);
        assert.equal(createdNotifications[0].recipient, "admin-1");
        assert.equal(createdNotifications[1].recipient, "admin-2");
        assert.equal(createdNotifications[0].title, "New Booking Alert");
      } finally {
        client.db = originalDb;
        Notification.create = originalCreate;
      }
    });
  });
});
