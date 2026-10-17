
import httpStatus from "http-status";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { inventoryService } from "./inventory.service";

const adjustStock = catchAsync(
  async (req: AuthenticatedRequest, res) => {
    const result = await inventoryService.adjustStock({
      productId: req.params.productId as string,
      movementType: req.body.movementType,
      quantity: req.body.quantity,
      reason: req.body.reason,
      performedBy: req.user!.id,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stock adjusted successfully",
      data: result,
    });
  },
);

const getMovementHistory = catchAsync(
  async (req: AuthenticatedRequest, res) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const result = await inventoryService.getMovementHistory(
      req.params.productId as string,
      page,
      limit,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Inventory movement history retrieved successfully",
      data: result,
    });
  },
);

const getLowStockProducts = catchAsync(
  async (req: AuthenticatedRequest, res) => {
    const result = await inventoryService.getLowStockProducts({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Low-stock products retrieved successfully",
      data: result,
    });
  },
);

const getInventoryStats = catchAsync(
  async (req: AuthenticatedRequest, res) => {
    const result = await inventoryService.getInventoryStats();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Inventory statistics retrieved successfully",
      data: result,
    });
  },
);

export const inventoryController = {
  adjustStock,
  getMovementHistory,
  getLowStockProducts,
  getInventoryStats,
};