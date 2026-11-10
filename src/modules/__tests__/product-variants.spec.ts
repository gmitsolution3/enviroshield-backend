import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose, { Types } from "mongoose";
import { cartService } from "../cart/cart.service";
import { orderService } from "../order/order.service";
import { inventoryService } from "../inventory/inventory.service";
import { INVENTORY_MOVEMENT_TYPE } from "../inventory/inventory.constant";
import Product from "../product/product.model";
import InventoryMovement from "../inventory/inventory.model";
import Order from "../order/order.model";
import { orderNotification } from "../order/order.notification";

describe("Product Variant System Unit & Integration Tests", () => {
  const MOCK_PRODUCT_ID = new Types.ObjectId("507f1f77bcf86cd799439011");
  const VARIANT_1_ID = new Types.ObjectId("507f1f77bcf86cd799439012");
  const VARIANT_2_ID = new Types.ObjectId("507f1f77bcf86cd799439013");
  const VARIANT_3_ID = new Types.ObjectId("507f1f77bcf86cd799439014");

  const mockProductWithVariants = {
    _id: MOCK_PRODUCT_ID,
    name: "Enviro PureSilk",
    slug: "enviro-puresilk",
    sku: "ENV-PS-MAIN",
    price: 650,
    costPrice: 400,
    stockQuantity: 45,
    lowStockThreshold: 5,
    status: "published",
    primaryImage: {
      url: "https://example.com/puresilk.jpg",
      publicId: "ps-img",
      alt: "Enviro PureSilk",
    },
    variants: [
      {
        _id: VARIANT_1_ID,
        weight: "0.96 Ltr",
        size: "0.96 Ltr",
        price: 650,
        costPrice: 400,
        sku: "ENV-PS-096",
        stockQuantity: 20,
        lowStockThreshold: 5,
      },
      {
        _id: VARIANT_2_ID,
        weight: "3.64 Ltr",
        size: "3.64 Ltr",
        price: 2250,
        costPrice: 1500,
        sku: "ENV-PS-364",
        stockQuantity: 15,
        lowStockThreshold: 3,
      },
      {
        _id: VARIANT_3_ID,
        weight: "9.1 Ltr",
        size: "9.1 Ltr",
        price: 9200,
        costPrice: 6500,
        sku: "ENV-PS-910",
        stockQuantity: 10,
        lowStockThreshold: 2,
      },
    ],
  };

  it("cart calculation correctly computes line totals and distinguishes different sizes of the same product", async () => {
    const originalFind = Product.find;

    try {
      Product.find = (() => ({
        select: async () => [mockProductWithVariants],
      })) as any;

      const result = await cartService.calculateCart({
        items: [
          {
            productId: MOCK_PRODUCT_ID.toString(),
            variantId: VARIANT_1_ID.toString(),
            quantity: 2,
          },
          {
            productId: MOCK_PRODUCT_ID.toString(),
            variantId: VARIANT_2_ID.toString(),
            quantity: 1,
          },
        ],
      });

      assert.equal(result.items.length, 2, "Should return 2 distinct cart lines for the two sizes");
      assert.equal(result.items[0].weight, "0.96 Ltr");
      assert.equal(result.items[0].size, "0.96 Ltr");
      assert.equal(result.items[0].unitPrice, 650);
      assert.equal(result.items[0].lineTotal, 1300);

      assert.equal(result.items[1].weight, "3.64 Ltr");
      assert.equal(result.items[1].size, "3.64 Ltr");
      assert.equal(result.items[1].unitPrice, 2250);
      assert.equal(result.items[1].lineTotal, 2250);

      assert.equal(result.summary.totalItems, 3);
      assert.equal(result.summary.subtotal, 3550);
    } finally {
      Product.find = originalFind;
    }
  });

  it("order creation deducts stock specifically from the ordered variant and captures variant snapshot", async () => {
    const originalFind = Product.find;
    const originalFindOneAndUpdate = Product.findOneAndUpdate;
    const originalOrderCreate = Order.create;
    const originalOrderFindById = Order.findById;
    const originalNotifyOrderPlaced = orderNotification.notifyOrderPlaced;
    const originalMovementCreate = InventoryMovement.create;
    const originalStartSession = mongoose.startSession;

    let updatedFilter: any = null;
    let updatedUpdate: any = null;
    let savedOrderItems: any[] = [];
    let savedMovements: any[] = [];
    let createdOrderDoc: any = null;

    try {
      Product.find = (() => ({
        select: () => ({
          session: async () => [mockProductWithVariants],
        }),
      })) as any;

      Product.findOneAndUpdate = (async (filter: any, update: any) => {
        updatedFilter = filter;
        updatedUpdate = update;
        return {
          ...mockProductWithVariants,
          variants: mockProductWithVariants.variants.map((v) =>
            v._id.equals(VARIANT_1_ID)
              ? { ...v, stockQuantity: v.stockQuantity - 2 }
              : v,
          ),
          stockQuantity: mockProductWithVariants.stockQuantity - 2,
        };
      }) as any;

      Order.create = (async (docs: any[]) => {
        savedOrderItems = docs[0].items;
        createdOrderDoc = {
          _id: new Types.ObjectId(),
          orderNumber: docs[0].orderNumber,
          userId: docs[0].userId,
          items: docs[0].items,
          customer: docs[0].customer,
          deliveryAddress: docs[0].deliveryAddress,
          subtotal: docs[0].subtotal,
          totalAmount: docs[0].totalAmount,
          status: "pending",
          paymentStatus: "pending",
          createdAt: new Date(),
        };
        return [createdOrderDoc];
      }) as any;

      Order.findById = (async () => createdOrderDoc) as any;
      orderNotification.notifyOrderPlaced = (async () => {}) as any;

      InventoryMovement.create = (async (docs: any[]) => {
        savedMovements.push(...docs);
        return docs;
      }) as any;

      mongoose.startSession = (async () => ({
        withTransaction: async (fn: () => Promise<any>) => fn(),
        endSession: async () => {},
      })) as any;

      const order = await orderService.createOrder(
        { id: "507f1f77bcf86cd799439099", email: "customer@example.com" },
        {
          items: [
            {
              productId: MOCK_PRODUCT_ID.toString(),
              variantId: VARIANT_1_ID.toString(),
              quantity: 2,
            },
          ],
          customer: { name: "Test User", phone: "+8801700000000" },
          deliveryAddress: {
            addressLine: "Gulshan-2",
            area: "Gulshan",
            city: "Dhaka",
            district: "Dhaka",
          },
          deliveryZone: "dhaka",
        },
      );

      assert.ok(order, "Order should be created");
      // Check stock deduction target
      assert.equal(
        updatedFilter["variants._id"].toString(),
        VARIANT_1_ID.toString(),
        "Must deduct stock targeting the specific variant ID",
      );
      assert.deepEqual(
        updatedUpdate.$inc,
        {
          "variants.$.stockQuantity": -2,
          stockQuantity: -2,
        },
        "Must deduct -2 from variant stockQuantity and top-level stockQuantity",
      );

      // Check order item snapshot
      assert.equal(savedOrderItems.length, 1);
      assert.equal(savedOrderItems[0].weight, "0.96 Ltr");
      assert.equal(savedOrderItems[0].size, "0.96 Ltr");
      assert.equal(savedOrderItems[0].sku, "ENV-PS-096");
      assert.equal(savedOrderItems[0].unitPrice, 650);
      assert.equal(savedOrderItems[0].lineTotal, 1300);

      // Check inventory movement
      assert.equal(savedMovements.length, 1);
      assert.equal(savedMovements[0].variantWeight, "0.96 Ltr");
      assert.equal(savedMovements[0].variantSize, "0.96 Ltr");
      assert.equal(savedMovements[0].quantity, 2);
    } finally {
      Product.find = originalFind;
      Product.findOneAndUpdate = originalFindOneAndUpdate;
      Order.create = originalOrderCreate;
      Order.findById = originalOrderFindById;
      orderNotification.notifyOrderPlaced = originalNotifyOrderPlaced;
      InventoryMovement.create = originalMovementCreate;
      mongoose.startSession = originalStartSession;
    }
  });

  it("adjustStock requires variantId when product has variants and updates variant stock", async () => {
    const originalFindById = Product.findById;
    const originalFindOneAndUpdate = Product.findOneAndUpdate;
    const originalMovementCreate = InventoryMovement.create;
    const originalStartSession = mongoose.startSession;

    let updatedFilter: any = null;
    let updatedUpdate: any = null;
    let savedMovements: any[] = [];

    try {
      Product.findById = (() => ({
        session: () => Promise.resolve(mockProductWithVariants),
      })) as any;

      Product.findOneAndUpdate = ((filter: any, update: any) => {
        updatedFilter = filter;
        updatedUpdate = update;
        return {
          ...mockProductWithVariants,
          stockQuantity: 50,
        };
      }) as any;

      InventoryMovement.create = ((docs: any[]) => {
        savedMovements = docs;
        return docs;
      }) as any;

      mongoose.startSession = (async () => ({
        withTransaction: async (fn: () => Promise<any>) => fn(),
        endSession: async () => {},
      })) as any;

      // 1. Should fail when variantId is not provided
      await assert.rejects(
        async () => {
          await inventoryService.adjustStock({
            productId: MOCK_PRODUCT_ID.toString(),
            movementType: INVENTORY_MOVEMENT_TYPE.INCREASE,
            quantity: 5,
            reason: "Batch restock",
            performedBy: "507f1f77bcf86cd799439099",
          });
        },
        {
          message: "Please select a product variant to adjust stock",
        },
      );

      // 2. Should succeed when variantId is provided
      const result = await inventoryService.adjustStock({
        productId: MOCK_PRODUCT_ID.toString(),
        variantId: VARIANT_2_ID.toString(),
        movementType: INVENTORY_MOVEMENT_TYPE.INCREASE,
        quantity: 5,
        reason: "Batch restock",
        performedBy: "507f1f77bcf86cd799439099",
      });

      assert.ok(result, "Stock adjustment should succeed");
      assert.equal(
        updatedFilter["variants._id"].toString(),
        VARIANT_2_ID.toString(),
        "Must target the specific variant",
      );
      assert.deepEqual(
        updatedUpdate.$inc,
        {
          "variants.$.stockQuantity": 5,
          stockQuantity: 5,
        },
        "Must increment variant stockQuantity and total stockQuantity by 5",
      );
      assert.equal(savedMovements.length, 1);
      assert.equal(savedMovements[0].variantWeight, "3.64 Ltr");
      assert.equal(savedMovements[0].variantSize, "3.64 Ltr");
      assert.equal(savedMovements[0].quantity, 5);
    } finally {
      Product.findById = originalFindById;
      Product.findOneAndUpdate = originalFindOneAndUpdate;
      InventoryMovement.create = originalMovementCreate;
      mongoose.startSession = originalStartSession;
    }
  });
});
