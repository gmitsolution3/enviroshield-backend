import httpStatus from "http-status";
import { TPaginationOptions } from "../../types/common";
import { AppError } from "../../utils/AppError";
import { calculatePagination } from "../../utils/calculatePagination";
import {
  CONTACT_SOURCE,
  CONTACT_STATUS,
  getAllowedContactStatusTransitions,
  isAllowedContactStatusTransition,
} from "./contact.constant";
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

  if (
    payload.status !== undefined &&
    payload.status !== existingContact.status
  ) {
    if (
      !isAllowedContactStatusTransition(
        existingContact.status,
        payload.status,
      )
    ) {
      const allowed = getAllowedContactStatusTransitions(
        existingContact.status,
      );
      const allowedText = allowed.length
        ? allowed.join(", ")
        : "none (terminal state)";
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot transition contact inquiry from "${existingContact.status}" to "${payload.status}". Allowed next statuses: ${allowedText}.`,
      );
    }
  }

  const updateFilter: Record<string, unknown> = { _id: contactId };
  if (
    payload.status !== undefined &&
    payload.status !== existingContact.status
  ) {
    updateFilter.status = existingContact.status;
  }

  const result = await Contact.findOneAndUpdate(updateFilter, payload, {
    new: true,
    runValidators: true,
  }).populate("serviceId");

  if (!result) {
    const latest = await Contact.findById(contactId).populate("serviceId");
    if (!latest)
      throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
    if (payload.status && latest.status === payload.status) {
      return latest;
    }
    throw new AppError(
      httpStatus.CONFLICT,
      "Contact status was modified concurrently. Please refresh and try again.",
    );
  }

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
