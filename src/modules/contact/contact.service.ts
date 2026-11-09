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
import {
  NOTIFICATION_ENTITY_TYPE,
  NOTIFICATION_TYPE,
} from "../notification/notification.constant";
import { notificationService } from "../notification/notification.service";
import { notifyNewContactInquiry } from "./contact.notification";
import { metaCapiService } from "../marketing/meta-capi.service";
import type { TCreateContactPayload } from "./contact.types";

const createContact = async (
  payload: TCreateContactPayload,
  requestContext?: { clientIp?: string; userAgent?: string },
) => {
  const { conversionContext, ...contactData } = payload;
  const result = await Contact.create({
    ...contactData,
    status: CONTACT_STATUS.NEW,
    source: CONTACT_SOURCE.WEBSITE,
  });

  // Emit in-app notification to all admins
  void notificationService
    .notifyAdmins({
      type: NOTIFICATION_TYPE.CONTACT_CREATED,
      title: "New Contact Inquiry",
      message: `New inquiry from ${result.fullName}${
        result.projectName ? " for " + result.projectName : ""
      }.`,
      entityType: NOTIFICATION_ENTITY_TYPE.CONTACT,
      entityId: (result._id as unknown as string).toString(),
      actionUrl: "/dashboard/contacts",
      metadata: {
        contactId: (result._id as unknown as string).toString(),
        customerName: result.fullName,
        email: result.email,
      },
    })
    .catch((err) =>
      console.error("Failed to notify admins of contact inquiry:", err),
    );

  // Send branded email notification to all admins
  void notifyNewContactInquiry(result).catch((err) =>
    console.error("Failed to send contact inquiry email:", err),
  );

  // Dispatch server-side Lead event to Meta CAPI
  void metaCapiService
    .dispatchLeadEvent({
      contact: result,
      context: {
        ...conversionContext,
        clientIp: requestContext?.clientIp,
        userAgent: requestContext?.userAgent,
      },
    })
    .catch((err) =>
      console.error("Failed to dispatch CAPI Lead event:", err),
    );

  return result;
};

const getAllContacts = async (
  query: TPaginationOptions & {
    status?: string;
    source?: string;
    serviceId?: string;
    search?: string;
    searchTerm?: string;
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

  const search = (query.search || query.searchTerm)?.trim();
  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { phoneNumber: searchRegex },
      { projectName: searchRegex },
    ];
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

  if (
    payload.status !== undefined &&
    payload.status !== existingContact.status
  ) {
    if (payload.status === CONTACT_STATUS.SITE_VISIT) {
      void notificationService
        .notifyAdmins({
          type: NOTIFICATION_TYPE.SITE_VISIT_SCHEDULED,
          title: "Site Visit Scheduled",
          message: `Site visit scheduled for inquiry from ${result.fullName}.`,
          entityType: NOTIFICATION_ENTITY_TYPE.CONTACT,
          entityId: (result._id as unknown as string).toString(),
          actionUrl: "/dashboard/contacts",
          metadata: {
            contactId: (result._id as unknown as string).toString(),
            customerName: result.fullName,
          },
        })
        .catch((err) =>
          console.error("Failed to notify admins of site visit:", err),
        );
    }
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
