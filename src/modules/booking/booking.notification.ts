import { ObjectId } from "mongodb";
import { transporter } from "../../config/mail";
import { client } from "../../config/mongodb";
import { emailLayout } from "../../utils/email-layout";
import Service from "../service/service.model";
import { BOOKING_STATUS } from "./booking.constant";
import type { TBooking, TBookingStatus } from "./booking.types";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

const formatBDT = (amount: number): string =>
  `৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (dateInput: Date | string): string => {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return String(dateInput);

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const statusLabels: Record<TBookingStatus, string> = {
  [BOOKING_STATUS.PENDING]: "Pending",
  [BOOKING_STATUS.CONFIRMED]: "Confirmed",
  [BOOKING_STATUS.IN_PROGRESS]: "In Progress",
  [BOOKING_STATUS.COMPLETED]: "Completed",
  [BOOKING_STATUS.CANCELLED]: "Cancelled",
  [BOOKING_STATUS.REJECTED]: "Rejected",
};

const statusColors: Record<TBookingStatus, string> = {
  [BOOKING_STATUS.PENDING]: "#b54708",
  [BOOKING_STATUS.CONFIRMED]: "#016edc",
  [BOOKING_STATUS.IN_PROGRESS]: "#0284c7",
  [BOOKING_STATUS.COMPLETED]: "#027a48",
  [BOOKING_STATUS.CANCELLED]: "#b42318",
  [BOOKING_STATUS.REJECTED]: "#b42318",
};

const statusMessages: Record<TBookingStatus, string> = {
  [BOOKING_STATUS.PENDING]:
    "Your service booking has been received and is pending review by our team.",
  [BOOKING_STATUS.CONFIRMED]:
    "Your service booking has been confirmed. Our team will contact you to coordinate the schedule.",
  [BOOKING_STATUS.IN_PROGRESS]:
    "Work on your service booking is currently in progress.",
  [BOOKING_STATUS.COMPLETED]:
    "Your service booking has been completed. Thank you for choosing Enviroshield!",
  [BOOKING_STATUS.CANCELLED]:
    "Your service booking has been cancelled. Please contact us if you have any questions.",
  [BOOKING_STATUS.REJECTED]:
    "Your service booking could not be accepted at this time. Please contact us for more information.",
};

type TResolvedBookingContext = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceName: string;
};

const resolveBookingContext = async (
  booking: TBooking,
): Promise<TResolvedBookingContext | null> => {
  let customerName = "Customer";
  let customerEmail = "";
  let customerPhone: string | undefined;

  const rawUserId = booking.userId as unknown;
  if (
    rawUserId &&
    typeof rawUserId === "object" &&
    "email" in (rawUserId as Record<string, unknown>)
  ) {
    const user = rawUserId as { name?: string; email?: string; phone?: string };
    customerName = user.name || "Customer";
    customerEmail = user.email || "";
    customerPhone = user.phone;
  } else if (typeof booking.userId === "string") {
    const userId = booking.userId;
    const orFilters: Record<string, unknown>[] = [
      { id: userId },
      { _id: userId },
    ];
    if (ObjectId.isValid(userId)) {
      orFilters.push({ _id: new ObjectId(userId) });
    }

    const user = await client
      .db(process.env.MONGODB_DB)
      .collection("user")
      .findOne(
        { $or: orFilters as never },
        {
          projection: {
            _id: 1,
            id: 1,
            name: 1,
            email: 1,
            phone: 1,
          },
        },
      );

    if (user && typeof user.email === "string") {
      customerEmail = user.email;
      if (typeof user.name === "string" && user.name.trim().length > 0) {
        customerName = user.name;
      }
      if (typeof user.phone === "string" && user.phone.trim().length > 0) {
        customerPhone = user.phone;
      }
    }
  }

  if (!customerEmail) {
    return null;
  }

  let serviceName = "Enviroshield Service";
  const rawServiceId = booking.serviceId as unknown;
  if (
    rawServiceId &&
    typeof rawServiceId === "object" &&
    "name" in (rawServiceId as Record<string, unknown>)
  ) {
    serviceName = (rawServiceId as { name: string }).name || serviceName;
  } else if (booking.serviceId) {
    const service = await Service.findById(booking.serviceId).select("name");
    if (service?.name) {
      serviceName = service.name;
    }
  }

  return {
    customerName,
    customerEmail,
    customerPhone,
    serviceName,
  };
};

const sendCustomerEmail = async (
  email: string,
  subject: string,
  preview: string,
  children: string,
  text: string,
): Promise<void> => {
  const html = emailLayout({
    preview: escapeHtml(preview),
    children,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text,
    html,
  });
};

const notifyBookingPlaced = async (booking: TBooking): Promise<void> => {
  const context = await resolveBookingContext(booking);
  if (!context) {
    console.warn(
      `Booking confirmation email skipped for ${booking.bookingNumber}: customer email not found.`,
    );
    return;
  }

  const { customerName, customerEmail, customerPhone, serviceName } = context;
  const subject = `Booking confirmation — ${booking.bookingNumber}`;
  const preview = `Thank you for your booking. Your booking ${booking.bookingNumber} for ${serviceName} has been received.`;

  const siteVisitText = booking.isSiteVisit
    ? booking.siteVisitDate
      ? `Requested (Scheduled: ${formatDateTime(booking.siteVisitDate)})`
      : "Requested (Scheduling pending)"
    : "Not requested";

  const areaText =
    booking.project.areaSize != null
      ? `${booking.project.areaSize} ${escapeHtml(booking.project.areaUnit || "sq ft")}`
      : undefined;

  const children = `
    <div style="color:#016edc;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">
      Service booking confirmation
    </div>

    <h1 style="color:#00334e;font-size:28px;line-height:36px;margin:12px 0;">
      Thank you, ${escapeHtml(customerName)}!
    </h1>

    <p style="color:#18384a;font-size:15px;line-height:25px;">
      We've received your service booking request. Our team will review your project details and keep you updated as it progresses.
    </p>

    <div style="margin:24px 0;padding:18px;background:#f0f0fa;border-radius:10px;">
      <div style="color:#64748b;font-size:12px;">Booking number</div>
      <div style="margin-top:5px;color:#00334e;font-size:20px;font-weight:800;">
        ${escapeHtml(booking.bookingNumber)}
      </div>

      <div style="margin-top:12px;color:#64748b;font-size:12px;">Service requested</div>
      <div style="margin-top:4px;color:#00334e;font-size:16px;font-weight:700;">
        ${escapeHtml(serviceName)}
      </div>

      <div style="margin-top:12px;color:#64748b;font-size:12px;">Current status</div>
      <div style="margin-top:4px;color:#016edc;font-weight:700;">
        ${statusLabels[booking.status] ?? "Pending"}
      </div>
    </div>

    <h2 style="color:#00334e;font-size:17px;margin:24px 0 12px;">Project details</h2>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border-collapse:collapse;border:1px solid #dfe5e9;">
      <tr>
        <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#64748b;width:35%;">Service</td>
        <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#00334e;font-weight:600;">
          ${escapeHtml(serviceName)}
        </td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#64748b;">Starting / Estimated Price</td>
        <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#016edc;font-weight:700;">
          ${formatBDT(booking.finalPrice)}
        </td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#64748b;">Project Location</td>
        <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#18384a;">
          ${escapeHtml(booking.project.location)}
        </td>
      </tr>
      ${
        areaText
          ? `
            <tr>
              <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#64748b;">Area Size</td>
              <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#18384a;">
                ${areaText}
              </td>
            </tr>
          `
          : ""
      }
      ${
        booking.project.message
          ? `
            <tr>
              <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#64748b;">Project Notes</td>
              <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#18384a;">
                ${escapeHtml(booking.project.message)}
              </td>
            </tr>
          `
          : ""
      }
      <tr>
        <td style="padding:12px;color:#64748b;">Site Visit Inspection</td>
        <td style="padding:12px;color:#18384a;">
          ${escapeHtml(siteVisitText)}
        </td>
      </tr>
    </table>

    <h2 style="margin-top:28px;color:#00334e;font-size:17px;">Customer information</h2>
    <p style="color:#18384a;font-size:14px;line-height:24px;">
      <strong>Name:</strong> ${escapeHtml(customerName)}<br>
      <strong>Email:</strong> ${escapeHtml(customerEmail)}<br>
      ${customerPhone ? `<strong>Phone:</strong> ${escapeHtml(customerPhone)}<br>` : ""}
    </p>

    <p style="margin-top:26px;color:#64748b;font-size:13px;line-height:22px;">
      Our team will review your project requirements and reach out to you shortly. Thank you for choosing Enviroshield.
    </p>
  `;

  const text = [
    "ENVIROSHIELD — SERVICE BOOKING CONFIRMATION",
    "",
    `Hello ${customerName},`,
    "Thank you for your service booking request. We've received it successfully.",
    "",
    `Booking number: ${booking.bookingNumber}`,
    `Service: ${serviceName}`,
    `Status: ${statusLabels[booking.status] ?? "Pending"}`,
    `Starting / Estimated price: ${formatBDT(booking.finalPrice)}`,
    `Location: ${booking.project.location}`,
    ...(areaText ? [`Area: ${booking.project.areaSize} ${booking.project.areaUnit || "sq ft"}`] : []),
    ...(booking.project.message ? [`Notes: ${booking.project.message}`] : []),
    `Site visit inspection: ${siteVisitText}`,
    "",
    "Our team will review your project requirements and reach out to you shortly.",
    "Enviroshield",
  ].join("\n");

  await sendCustomerEmail(
    customerEmail,
    subject,
    preview,
    children,
    text,
  );
};

const notifyBookingStatusUpdated = async (
  booking: TBooking,
  previousStatus: TBookingStatus,
): Promise<void> => {
  const context = await resolveBookingContext(booking);
  if (!context) {
    console.warn(
      `Booking status update email skipped for ${booking.bookingNumber}: customer email not found.`,
    );
    return;
  }

  const { customerName, customerEmail, serviceName } = context;
  const currentStatus = statusLabels[booking.status] ?? booking.status;
  const oldStatus = statusLabels[previousStatus] ?? previousStatus;
  const statusColor = statusColors[booking.status] ?? "#016edc";
  const subject = `Booking update — ${booking.bookingNumber}: ${currentStatus}`;
  const preview = `Your service booking ${booking.bookingNumber} is now ${currentStatus.toLowerCase()}.`;

  const siteVisitInfo =
    booking.isSiteVisit && booking.siteVisitDate
      ? `
        <div style="margin-top:12px;color:#64748b;font-size:12px;">Scheduled site visit</div>
        <div style="margin-top:4px;color:#00334e;font-weight:700;">
          ${formatDateTime(booking.siteVisitDate)}
        </div>
      `
      : "";

  const children = `
    <div style="color:#016edc;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">
      Booking status update
    </div>

    <h1 style="color:#00334e;font-size:27px;line-height:35px;margin:12px 0;">
      Your booking status has changed
    </h1>

    <p style="color:#18384a;font-size:15px;line-height:25px;">
      Hello ${escapeHtml(customerName)}, there's an update to your Enviroshield service booking.
    </p>

    <div style="margin:24px 0;padding:20px;background:#f0f0fa;border-radius:10px;">
      <div style="color:#64748b;font-size:12px;">Booking number</div>
      <div style="margin:5px 0 16px;color:#00334e;font-size:20px;font-weight:800;">
        ${escapeHtml(booking.bookingNumber)}
      </div>

      <div style="color:#64748b;font-size:12px;">Service</div>
      <div style="margin:5px 0 16px;color:#00334e;font-size:16px;font-weight:700;">
        ${escapeHtml(serviceName)}
      </div>

      <div style="color:#64748b;font-size:12px;">Previous status</div>
      <div style="margin:5px 0 16px;color:#18384a;font-weight:700;">
        ${escapeHtml(oldStatus)}
      </div>

      <div style="color:#64748b;font-size:12px;">New status</div>
      <div style="margin-top:5px;color:${statusColor};font-size:20px;font-weight:800;">
        ${escapeHtml(currentStatus)}
      </div>

      ${siteVisitInfo}
    </div>

    <p style="color:#18384a;font-size:15px;line-height:25px;">
      ${statusMessages[booking.status] ?? ""}
    </p>

    <p style="margin-top:24px;color:#64748b;font-size:13px;line-height:22px;">
      Service: <strong>${escapeHtml(serviceName)}</strong><br>
      Current price: <strong>${formatBDT(booking.finalPrice)}</strong>
    </p>

    <p style="margin-top:20px;color:#64748b;font-size:13px;line-height:22px;">
      If you have questions about your service booking, feel free to reply or contact our customer support.
    </p>
  `;

  const text = [
    "ENVIROSHIELD — SERVICE BOOKING STATUS UPDATE",
    "",
    `Hello ${customerName},`,
    "There's an update to your Enviroshield service booking.",
    "",
    `Booking number: ${booking.bookingNumber}`,
    `Service: ${serviceName}`,
    `Previous status: ${oldStatus}`,
    `New status: ${currentStatus}`,
    ...(booking.isSiteVisit && booking.siteVisitDate
      ? [`Scheduled site visit: ${formatDateTime(booking.siteVisitDate)}`]
      : []),
    "",
    statusMessages[booking.status] ?? "",
    "",
    `Price: ${formatBDT(booking.finalPrice)}`,
    "",
    "If you have questions about your service booking, please contact us.",
    "Enviroshield",
  ].join("\n");

  await sendCustomerEmail(
    customerEmail,
    subject,
    preview,
    children,
    text,
  );
};

const notifyBookingCancelled = async (
  booking: TBooking,
  previousStatus: TBookingStatus,
): Promise<void> => {
  const context = await resolveBookingContext(booking);
  if (!context) {
    console.warn(
      `Booking cancellation email skipped for ${booking.bookingNumber}: customer email not found.`,
    );
    return;
  }

  const { customerName, customerEmail, serviceName } = context;
  const subject = `Booking cancelled — ${booking.bookingNumber}`;
  const preview = `Your Enviroshield service booking ${booking.bookingNumber} has been cancelled.`;

  const children = `
    <div style="color:#016edc;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">
      Booking cancellation
    </div>

    <h1 style="color:#00334e;font-size:28px;line-height:36px;margin:12px 0;">
      Your service booking has been cancelled
    </h1>

    <p style="color:#18384a;font-size:15px;line-height:25px;">
      Hello ${escapeHtml(customerName)}, your Enviroshield booking for <strong>${escapeHtml(serviceName)}</strong> has been cancelled.
    </p>

    <div style="margin:24px 0;padding:20px;background:#f0f0fa;border-radius:10px;">
      <div style="color:#64748b;font-size:12px;">Booking number</div>
      <div style="margin:5px 0 18px;color:#00334e;font-size:20px;font-weight:800;">
        ${escapeHtml(booking.bookingNumber)}
      </div>

      <div style="color:#64748b;font-size:12px;">Service</div>
      <div style="margin:5px 0 18px;color:#00334e;font-size:16px;font-weight:700;">
        ${escapeHtml(serviceName)}
      </div>

      <div style="color:#64748b;font-size:12px;">Booking status</div>
      <div style="margin-top:5px;color:#b42318;font-size:18px;font-weight:800;">
        Cancelled
      </div>
    </div>

    <p style="color:#18384a;font-size:14px;line-height:24px;">
      If you did not request this cancellation or if you have questions, please contact our team.
    </p>

    <p style="margin-top:20px;color:#64748b;font-size:13px;line-height:22px;">
      Thank you for your interest in Enviroshield. We hope to serve you again in the future.
    </p>
  `;

  const text = [
    "ENVIROSHIELD — SERVICE BOOKING CANCELLATION",
    "",
    `Hello ${customerName},`,
    `Your service booking for ${serviceName} has been cancelled.`,
    "",
    `Booking number: ${booking.bookingNumber}`,
    `Service: ${serviceName}`,
    "Booking status: Cancelled",
    "",
    "If you have questions about this cancellation, please contact our team.",
    "Enviroshield",
  ].join("\n");

  await sendCustomerEmail(
    customerEmail,
    subject,
    preview,
    children,
    text,
  );
};

export const bookingNotification = {
  notifyBookingPlaced,
  notifyBookingStatusUpdated,
  notifyBookingCancelled,
};
