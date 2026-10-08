import httpStatus from "http-status";
import { TPaginationOptions } from "../../types/common";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import { CONTACT_SOURCE, CONTACT_STATUS } from "./contact.constant";
import Contact from "./contact.model";
import { TContact } from "./contact.types";

const createContact = async (
  payload: Omit<TContact, "status" | "source">,
) => {
  const result = await Contact.create({
    ...payload,
    status: CONTACT_STATUS.NEW,
    source: CONTACT_SOURCE.WEBSITE,
  });

  return result;
};

const getAllContacts = async (
  query: TPaginationOptions & {
    status?: string;
    source?: string;
    serviceId?: string;
  },
) => {
  const { page, limit, skip } = calculatePagination(query);

  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.source) {
    filter.source = query.source;
  }

  if (query.serviceId) {
    filter.serviceId = query.serviceId;
  }

  const contacts = await Contact.find(filter)
    .populate("serviceId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Contact.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: contacts,
  };
};

const getContactById = async (contactId: string) => {
  const result =
    await Contact.findById(contactId).populate("serviceId");

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  }

  return result;
};

const updateContact = async (
  contactId: string,
  payload: Partial<TContact>,
) => {
  const existingContact = await Contact.findById(contactId);

  if (!existingContact) {
    throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  }

  const result = await Contact.findByIdAndUpdate(contactId, payload, {
    new: true,
    runValidators: true,
  }).populate("serviceId");

  return result;
};

const deleteContact = async (contactId: string) => {
  const existingContact = await Contact.findById(contactId);

  if (!existingContact) {
    throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  }

  await Contact.findByIdAndDelete(contactId);

  return null;
};

export const contactService = {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
};
