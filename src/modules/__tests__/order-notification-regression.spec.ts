import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose, { Types } from "mongoose";
import { client } from "../../config/mongodb";
import {
  NOTIFICATION_ENTITY_TYPE,
  NOTIFICATION_TYPE,
} from "../notification/notification.constant";
import Notification from "../notification/notification.model";
import { notificationService } from "../notification/notification.service";
import Order from "../order/order.model";
import { orderNotification } from "../order/order.notification";
import { orderService } from "../order/order.service";
import Product from "../product/product.model";
import InventoryMovement from "../inventory/inventory.model";

const MOCK_ADMIN_ID = "507f1f77bcf86cd799439001";
const MOCK_CUSTOMER_ID = "507f1f77bcf86cd799439002";
const MOCK_PRODUCT_ID = "507f1f77bcf86cd799439003";

describe("Regression: Admin Order Notification Flow", () => {
  it("creates admin notification, delivers to admin, isolates from customer, and sends single customer email", async () => {
    // 1. Spies and stores
    const notificationsStore: any[] = [];
    let customerEmailsSent = 0;
    let createdOrderDoc: any = null;

    const originalNotifyOrderPlaced = orderNotification.notifyOrderPlaced;
    const originalNotificationCreate = Notification.create;
    const originalNotificationFind = Notification.find;
    const originalNotificationCount = Notification.countDocuments;
    const originalProductFind = Product.find;
    const originalProductFindById = Product.findById;
    const originalProductFindOneAndUpdate = Product.findOneAndUpdate;
    const originalOrderCreate = Order.create;
    const originalOrderFindById = Order.findById;
    const originalInventoryMovementCreate = InventoryMovement.create;
    const originalStartSession = mongoose.startSession;
    const originalDb = client.db;

    try {
      // Mock client.db to return the administrator user
      client.db = (() => ({
        collection: (colName: string) => ({
          find: (query: any) => ({
            toArray: async () => {
              if (colName === "user" && query.role === "admin") {
                return [
                  {
                    _id: { toString: () => MOCK_ADMIN_ID },
                    id: MOCK_ADMIN_ID,
                    email: "admin@enviroshield.com",
                    role: "admin",
                    banned: false,
                  },
                ];
              }
              return [];
            },
          }),
        }),
      })) as any;

      const mockProduct = {
        _id: new Types.ObjectId(MOCK_PRODUCT_ID),
        name: "Enviro Air Filter",
        slug: "enviro-air-filter",
        sku: "ENV-AF-001",
        price: 1500,
        stockQuantity: 20,
        lowStockThreshold: 5,
        status: "published",
      };

      // Mock Product lookup and stock check
      Product.find = (() => ({
        select: () => ({
          session: async () => [mockProduct],
        }),
      })) as any;

      Product.findById = (() => ({
        session: () => mockProduct,
      })) as any;

      Product.findOneAndUpdate = (async () => ({
        ...mockProduct,
        stockQuantity: 19,
      })) as any;

      // Mock InventoryMovement creation
      InventoryMovement.create = (async () => []) as any;

      // Mock Order creation inside transaction
      Order.create = (async (docs: any[]) => {
        createdOrderDoc = {
          _id: new Types.ObjectId("507f1f77bcf86cd799439099"),
          orderNumber: docs[0].orderNumber,
          userId: docs[0].userId,
          items: docs[0].items,
          customer: docs[0].customer,
          deliveryAddress: docs[0].deliveryAddress,
          deliveryZone: docs[0].deliveryZone,
          deliveryFee: docs[0].deliveryFee,
          subtotal: docs[0].subtotal,
          totalAmount: docs[0].totalAmount,
          currency: "BDT",
          paymentMethod: "cod",
          paymentStatus: "pending",
          status: "pending",
          createdAt: new Date(),
        };
        return [createdOrderDoc];
      }) as any;

      Order.findById = (async () => createdOrderDoc) as any;

      // Mock Mongoose Transaction Session
      mongoose.startSession = (async () => ({
        withTransaction: async (fn: () => Promise<any>) => fn(),
        endSession: async () => {},
      })) as any;

      // Mock Notification.create to store in memory
      Notification.create = (async (doc: any) => {
        const item = {
          _id: new Types.ObjectId(),
          ...doc,
          createdAt: new Date(),
        };
        notificationsStore.push(item);
        return item;
      }) as any;

      // Mock Notification.find and countDocuments for query verification
      Notification.find = ((filter: any) => {
        const matches = notificationsStore.filter((n) => {
          if (n.recipient !== filter.recipient) return false;
          if (filter.isRead !== undefined && n.isRead !== filter.isRead)
            return false;
          return true;
        });

        return {
          sort: () => ({
            skip: () => ({
              limit: async () => matches,
            }),
          }),
        };
      }) as any;

      Notification.countDocuments = (async (filter: any) => {
        return notificationsStore.filter((n) => {
          if (n.recipient !== filter.recipient) return false;
          if (filter.isRead !== undefined && n.isRead !== filter.isRead)
            return false;
          return true;
        }).length;
      }) as any;

      // Spy on orderNotification.notifyOrderPlaced to verify customer email
      orderNotification.notifyOrderPlaced = async (order: any) => {
        customerEmailsSent += 1;
        assert.equal(order.orderNumber, createdOrderDoc.orderNumber);
      };

      // 2. Customer places an order through the actual business flow
      const order = await orderService.createOrder(
        {
          id: MOCK_CUSTOMER_ID,
          email: "customer@example.com",
        },
        {
          items: [
            {
              productId: MOCK_PRODUCT_ID,
              quantity: 1,
            },
          ],
          customer: {
            name: "John Customer",
            phone: "+8801700000000",
          },
          deliveryAddress: {
            addressLine: "House 10, Road 4",
            area: "Dhanmondi",
            city: "Dhaka",
            district: "Dhaka",
          },
          deliveryZone: "dhaka",
          customerNote: "Please ring the bell.",
        },
      );

      // 3. Verify order persistence
      assert.ok(order, "Order should be returned");
      assert.ok(order.orderNumber, "Order should have a valid orderNumber");
      assert.equal(order.userId, MOCK_CUSTOMER_ID);

      // 4. Verify admin notification was created
      assert.equal(
        notificationsStore.length,
        1,
        "Exactly one notification should be created",
      );
      const adminNotif = notificationsStore[0];
      assert.equal(
        adminNotif.recipient,
        MOCK_ADMIN_ID,
        "Notification recipient must be the administrator",
      );
      assert.equal(
        adminNotif.type,
        NOTIFICATION_TYPE.ORDER_CREATED,
        "Notification type must be order.created",
      );
      assert.equal(
        adminNotif.entityType,
        NOTIFICATION_ENTITY_TYPE.ORDER,
        "Entity type must be order",
      );
      assert.equal(
        adminNotif.actionUrl,
        "/dashboard/ecommerce/orders",
        "Action URL must route to admin order management",
      );
      assert.ok(
        adminNotif.message.includes(order.orderNumber),
        "Notification message must reference the order number",
      );

      // 5. Query notifications using Administrator authenticated identity
      const adminInbox = await notificationService.getNotifications(
        MOCK_ADMIN_ID,
        { page: "1", limit: "10" },
      );
      assert.equal(
        adminInbox.data.length,
        1,
        "Admin inbox should receive the notification",
      );
      assert.equal(adminInbox.data[0].title, "New Order Placed");
      assert.equal(adminInbox.meta.total, 1);

      // 6. Verify Administrator unread count increased
      const adminUnread = await notificationService.getUnreadCount(
        MOCK_ADMIN_ID,
      );
      assert.equal(
        adminUnread.unreadCount,
        1,
        "Admin unread count must be incremented to 1",
      );

      // 7. Verify Customer isolation: Customer does NOT receive admin notification
      const customerInbox = await notificationService.getNotifications(
        MOCK_CUSTOMER_ID,
        { page: "1", limit: "10" },
      );
      assert.equal(
        customerInbox.data.length,
        0,
        "Customer inbox must NOT contain administrator order notification",
      );
      const customerUnread = await notificationService.getUnreadCount(
        MOCK_CUSTOMER_ID,
      );
      assert.equal(
        customerUnread.unreadCount,
        0,
        "Customer unread count must be 0",
      );

      // 8. Verify existing customer order confirmation email was sent exactly once
      assert.equal(
        customerEmailsSent,
        1,
        "Customer confirmation email must be sent exactly once without duplicate emails",
      );
    } finally {
      orderNotification.notifyOrderPlaced = originalNotifyOrderPlaced;
      Notification.create = originalNotificationCreate;
      Notification.find = originalNotificationFind;
      Notification.countDocuments = originalNotificationCount;
      Product.find = originalProductFind;
      Product.findById = originalProductFindById;
      Product.findOneAndUpdate = originalProductFindOneAndUpdate;
      Order.create = originalOrderCreate;
      Order.findById = originalOrderFindById;
      InventoryMovement.create = originalInventoryMovementCreate;
      mongoose.startSession = originalStartSession;
      client.db = originalDb;
    }
  });
});
