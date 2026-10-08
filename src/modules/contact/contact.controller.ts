import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { contactService } from "./contact.service";

const createContact = catchAsync(
  async (req: Request, res: Response) => {
    const result = await contactService.createContact(req.body);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Contact submitted successfully",
      data: result,
    });
  },
);

const getAllContacts = catchAsync(
  async (req: Request, res: Response) => {
    const result = await contactService.getAllContacts(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Contacts retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getContactById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await contactService.getContactById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Contact retrieved successfully",
      data: result,
    });
  },
);

const updateContact = catchAsync(
  async (req: Request, res: Response) => {
    const result = await contactService.updateContact(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Contact updated successfully",
      data: result,
    });
  },
);

const deleteContact = catchAsync(
  async (req: Request, res: Response) => {
    await contactService.deleteContact(req.params.id as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Contact deleted successfully",
      data: null,
    });
  },
);

export const contactController = {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
};
