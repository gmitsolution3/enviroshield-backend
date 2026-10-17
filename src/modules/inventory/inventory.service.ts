import httpStatus from "http-status";
import { ObjectId } from "mongodb";
import mongoose, { Types } from "mongoose";
import { client } from "../../config/mongodb";
import { AppError } from "../../utils/AppError";
import Product from "../product/product.model";
import { INVENTORY_MOVEMENT_TYPE } from "./inventory.constant";
import InventoryMovement from "./inventory.model";
import { calculatePagination } from "../../utils/calculatePagination";
import { toCsv } from "../../utils/csv";

type TAdjustStockPayload = {
  productId: string;
  movementType: "increase" | "decrease";
  quantity: number;
  reason: string;
  performedBy: string;
};

const getPerformerDetails = async (performerId: string) => {
  if (!ObjectId.isValid(performerId)) {
    return null;
  }

  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection("user").findOne(
    {
      _id: new ObjectId(performerId),
    },
    {
      projection: {
        _id: 0,
        id: 1,
        name: 1,
        email: 1,
        image: 1,
      },
    },
  );

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
  };
};

const attachPerformer = async (movement: any) => {
  const movementObject =
    typeof movement.toObject === "function"
      ? movement.toObject()
      : movement;

  return {
    ...movementObject,
    performedBy: await getPerformerDetails(
      movementObject.performedBy,
    ),
  };
};

const adjustStock = async (payload: TAdjustStockPayload) => {
  if (!Types.ObjectId.isValid(payload.productId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid product ID");
  }

  if (!Types.ObjectId.isValid(payload.performedBy)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid admin ID");
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Quantity must be a positive whole number",
    );
  }

  const reason = payload.reason.trim();

  if (!reason) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A reason for the stock adjustment is required",
    );
  }

  if (
    payload.movementType !== INVENTORY_MOVEMENT_TYPE.INCREASE &&
    payload.movementType !== INVENTORY_MOVEMENT_TYPE.DECREASE
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid inventory movement type",
    );
  }

  const session = await mongoose.startSession();

  try {
    let result:
      | {
          product: NonNullable<
            Awaited<ReturnType<typeof Product.findById>>
          >;
          movement: InstanceType<typeof InventoryMovement>;
        }
      | undefined;

    await session.withTransaction(async () => {
      const product = await Product.findById(
        payload.productId,
      ).session(session);

      if (!product) {
        throw new AppError(httpStatus.NOT_FOUND, "Product not found");
      }

      const previousStock = product.stockQuantity;

      const resultingStock =
        payload.movementType === INVENTORY_MOVEMENT_TYPE.INCREASE
          ? previousStock + payload.quantity
          : previousStock - payload.quantity;

      if (resultingStock < 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Insufficient stock. Available quantity: ${previousStock}`,
        );
      }

      // Conditional update prevents a concurrent request from
      // changing stock based on an outdated quantity.
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stockQuantity: previousStock,
        },
        {
          $set: { stockQuantity: resultingStock },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!updatedProduct) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Stock changed during this adjustment. Please retry.",
        );
      }

      const [movement] = await InventoryMovement.create(
        [
          {
            productId: product._id,
            movementType: payload.movementType,
            quantity: payload.quantity,
            previousStock,
            resultingStock,
            reason,
            performedBy: payload.performedBy,
          },
        ],
        { session },
      );

      result = {
        product: updatedProduct,
        movement,
      };
    });

    if (!result) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Stock adjustment could not be completed",
      );
    }

    return result;
  } finally {
    await session.endSession();
  }
};

const getMovementHistory = async (
  productId: string,
  page = 1,
  limit = 20,
) => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid product ID");
  }

  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedLimit = Math.min(
    100,
    Math.max(1, Math.floor(limit)),
  );
  const skip = (normalizedPage - 1) * normalizedLimit;

  const productExists = await Product.exists({ _id: productId });

  if (!productExists) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found");
  }

  const filter = {
    productId: new Types.ObjectId(productId),
  };

  const [movements, total] = await Promise.all([
    InventoryMovement.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(normalizedLimit)
      .lean(),

    InventoryMovement.countDocuments(filter),
  ]);

  const enrichedMovements = await Promise.all(
    movements.map((movement) => attachPerformer(movement)),
  );

  return {
    movements: enrichedMovements,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages: Math.ceil(total / normalizedLimit),
    },
  };
};


const getLowStockProducts = async (query: {
  page?: string;
  limit?: string;
}) => {
  const { page, limit: requestedLimit } = calculatePagination(query);
const limit = Math.min(requestedLimit, 100);
const skip = (page - 1) * limit;

  const filter = {
    $expr: {
      $lte: ["$stockQuantity", "$lowStockThreshold"],
    },
  };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("name slug sku primaryImage stockQuantity lowStockThreshold status")
      .sort({ stockQuantity: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Product.countDocuments(filter),
  ]);

  const effectiveLimit = Math.min(limit, 100);

  return {
    products,
    pagination: {
      page,
      limit: effectiveLimit,
      total,
      totalPages: Math.ceil(total / effectiveLimit),
    },
  };
};

const getInventoryStats = async () => {
  const lowStockFilter = {
    $expr: {
      $lte: ["$stockQuantity", "$lowStockThreshold"],
    },
  };

  const [
    totalProducts,
    lowStockProducts,
    outOfStockProducts,
    stockTotals,
  ] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments(lowStockFilter),
    Product.countDocuments({ stockQuantity: 0 }),
    Product.aggregate([
      {
        $group: {
          _id: null,
          totalUnitsInStock: {
            $sum: "$stockQuantity",
          },
        },
      },
    ]),
  ]);

  return {
    totalProducts,
    lowStockProducts,
    outOfStockProducts,
    totalUnitsInStock: stockTotals[0]?.totalUnitsInStock ?? 0,
  };
};


type TGlobalMovementHistoryQuery = {
  page?: number;
  limit?: number;
  movementType?: "initial" | "increase" | "decrease";
  productId?: string;
  performedBy?: string;
  startDate?: string;
  endDate?: string;
};

const getGlobalMovementHistory = async (
  query: TGlobalMovementHistoryQuery,
) => {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(query.limit ?? 20)),
  );
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (query.movementType) {
    filter.movementType = query.movementType;
  }

  if (query.productId) {
    if (!mongoose.Types.ObjectId.isValid(query.productId)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Invalid product ID",
      );
    }

    filter.productId = new mongoose.Types.ObjectId(query.productId);
  }

  if (query.performedBy) {
    filter.performedBy = query.performedBy;
  }

  if (query.startDate || query.endDate) {
    const createdAt: Record<string, Date> = {};

    if (query.startDate) {
      const startDate = new Date(query.startDate);

      if (Number.isNaN(startDate.getTime())) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Invalid start date",
        );
      }

      createdAt.$gte = startDate;
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);

      if (Number.isNaN(endDate.getTime())) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Invalid end date",
        );
      }

      createdAt.$lte = endDate;
    }

    if (
      createdAt.$gte &&
      createdAt.$lte &&
      createdAt.$gte > createdAt.$lte
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Start date must be before or equal to end date",
      );
    }

    filter.createdAt = createdAt;
  }

  const [movements, total] = await Promise.all([
    InventoryMovement.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InventoryMovement.countDocuments(filter),
  ]);

  const movementsWithPerformers = await Promise.all(
    movements.map((movement) => attachPerformer(movement)),
  );

  return {
    movements: movementsWithPerformers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};


const exportStockCsv = async (): Promise<string> => {
  const products = await Product.find({})
    .select(
      "name slug sku stockQuantity lowStockThreshold status",
    )
    .sort({ name: 1, _id: 1 })
    .lean();

  const headers = [
    "Product ID",
    "Product Name",
    "Slug",
    "SKU",
    "Stock Quantity",
    "Low Stock Threshold",
    "Status",
  ];

  const rows = products.map((product) => [
    product._id.toString(),
    product.name,
    product.slug,
    product.sku ?? "",
    product.stockQuantity,
    product.lowStockThreshold,
    product.status,
  ]);

  return toCsv(headers, rows);
};



const exportMovementHistoryCsv = async (): Promise<string> => {
  const movements = await InventoryMovement.find({})
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  const headers = [
    "Movement ID",
    "Product ID",
    "Movement Type",
    "Quantity",
    "Previous Stock",
    "Resulting Stock",
    "Reason",
    "Performed By",
    "Created At",
  ];

  const movementsWithPerformers = await Promise.all(
    movements.map((movement) => attachPerformer(movement)),
  );

  const rows = movementsWithPerformers.map((movement) => [
    movement._id.toString(),
    movement.productId.toString(),
    movement.movementType,
    movement.quantity,
    movement.previousStock,
    movement.resultingStock,
    movement.reason,
    typeof movement.performedBy === "object" &&
    movement.performedBy !== null
      ? movement.performedBy.name ?? movement.performedBy.email ?? ""
      : movement.performedBy,
    movement.createdAt
      ? new Date(movement.createdAt).toISOString()
      : "",
  ]);

  return toCsv(headers, rows);
};


export const inventoryService = {
  adjustStock,
  getMovementHistory,
  getLowStockProducts,
  getInventoryStats,
  getGlobalMovementHistory,
  exportStockCsv,
  exportMovementHistoryCsv,
};