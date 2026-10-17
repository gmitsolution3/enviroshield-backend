
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

export const inventoryController = {
  adjustStock,
};
