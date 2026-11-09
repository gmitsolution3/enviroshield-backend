import crypto from "crypto";
import mongoose from "mongoose";
import { decrypt, isEncryptionKeyConfigured } from "../../utils/crypto";
import { Settings } from "../settings/settings.model";
import {
  ConversionEvent,
  TConversionEntityType,
} from "./conversion-event.model";

// Allowed domains for event_source_url validation
const ALLOWED_ORIGINS = [
  "https://www.enviroshieldbd.com",
  "https://enviroshieldbd.com",
  "https://enviroshield.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const DEFAULT_EVENT_SOURCE_URL = "https://www.enviroshieldbd.com";
const DEFAULT_GRAPH_API_VERSION = "v22.0";
const REQUEST_TIMEOUT_MS = 8000;

export interface IMetaCapiConfig {
  enabled: boolean;
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
}

export interface IMetaUserData {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
}

export interface IMetaCapiEventPayload {
  [key: string]: unknown;
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url?: string;
  user_data: IMetaUserData;
  custom_data?: Record<string, unknown>;
}

export interface IConversionContextInput {
  eventId?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  marketingConsent?: boolean;
  clientIp?: string;
  userAgent?: string;
}

/**
 * SHA-256 hashes a normalized string into lowercase hex.
 */
export function sha256Hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Normalizes and hashes email address.
 * Standard: trim and lowercase before hashing.
 */
export function normalizeAndHashEmail(email?: string): string | null {
  if (!email || typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0 || !normalized.includes("@")) return null;
  return sha256Hash(normalized);
}

/**
 * Normalizes and hashes phone number.
 * Standard: strip all non-digits, ensure country code (880 for BD local numbers), hash.
 */
export function normalizeAndHashPhone(phone?: string): string | null {
  if (!phone || typeof phone !== "string") return null;
  let digits = phone.replace(/[^0-9]/g, "");
  if (!digits || digits.length < 7) return null;

  // In Bangladesh, numbers often start with 01XXXXXXXXX (11 digits).
  // Meta requires country code prefix: 8801XXXXXXXXX
  if (digits.length === 11 && digits.startsWith("01")) {
    digits = `88${digits}`;
  } else if (digits.length === 10 && digits.startsWith("1")) {
    digits = `880${digits}`;
  }

  return sha256Hash(digits);
}

/**
 * Normalizes and hashes a name component (first name or last name).
 * Standard: lowercase, trim, remove punctuation, hash.
 */
export function normalizeAndHashName(name?: string): string | null {
  if (!name || typeof name !== "string") return null;
  // Lowercase, trim, remove punctuation and symbols
  const cleaned = name
    .toLowerCase()
    .replace(/[!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]/g, "")
    .trim();
  if (!cleaned) return null;
  return sha256Hash(cleaned);
}

/**
 * Splits a full name into first and last name components.
 */
export function splitName(fullName?: string): {
  firstName?: string;
  lastName?: string;
} {
  if (!fullName || typeof fullName !== "string") return {};
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return {};
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Validates and sanitizes eventSourceUrl against configured allowed domains.
 */
export function sanitizeEventSourceUrl(url?: string): string {
  if (!url || typeof url !== "string") return DEFAULT_EVENT_SOURCE_URL;

  try {
    const parsed = new URL(url);
    const origin = parsed.origin.toLowerCase();
    const isAllowed = ALLOWED_ORIGINS.some(
      (allowed) => origin === allowed.toLowerCase(),
    );
    if (isAllowed) {
      return url;
    }
  } catch {
    // Malformed URL, fall back to default
  }

  return DEFAULT_EVENT_SOURCE_URL;
}

/**
 * Generates a unique event ID for server-originated events without browser ID.
 */
export function generateEventId(prefix = "srv"): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString("hex");
  return `es_${prefix}_${timestamp}_${random}`;
}

/**
 * Retrieves enabled CAPI configuration and decrypts the access token.
 * Returns null if CAPI is disabled or not properly configured.
 */
export async function getCapiConfig(): Promise<IMetaCapiConfig | null> {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }
  try {
    const settings = await Settings.getSettings();
    const metaPixel = settings.marketing?.metaPixel;
    const capi = metaPixel?.capi;

    if (!metaPixel?.enabled || !capi?.enabled) {
      return null;
    }

    const pixelId = metaPixel.pixelId?.trim();
    if (!pixelId) {
      console.warn("[Meta CAPI] Meta Pixel is enabled with CAPI, but pixelId is empty.");
      return null;
    }

    const encryptedToken = capi.accessToken?.trim();
    if (!encryptedToken) {
      console.warn("[Meta CAPI] CAPI is enabled, but access token is not configured.");
      return null;
    }

    if (!isEncryptionKeyConfigured()) {
      console.error(
        "[Meta CAPI] CAPI is enabled, but META_CAPI_ENCRYPTION_KEY is not configured. Events cannot be dispatched.",
      );
      return null;
    }

    const decryptedToken = decrypt(encryptedToken);
    if (!decryptedToken || decryptedToken.trim().length === 0) {
      console.error("[Meta CAPI] Failed to decrypt CAPI access token.");
      return null;
    }

    return {
      enabled: true,
      pixelId,
      accessToken: decryptedToken.trim(),
      testEventCode: capi.testEventCode?.trim() || undefined,
    };
  } catch (error) {
    console.error("[Meta CAPI] Failed to retrieve CAPI configuration:", error);
    return null;
  }
}

/**
 * Checks if marketing consent is granted based on settings and context.
 */
export async function checkMarketingConsent(
  context?: IConversionContextInput,
): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) {
    return context?.marketingConsent === true;
  }
  try {
    const settings = await Settings.getSettings();
    const consent = settings.consent;

    // If consent system is disabled, consent is considered granted
    if (!consent?.enabled) {
      return true;
    }

    // If marketing consent is not required, consent is considered granted
    if (!consent.requireMarketingConsent) {
      return true;
    }

    // Otherwise, marketingConsent must be explicitly true
    return context?.marketingConsent === true;
  } catch (error) {
    console.warn("[Meta CAPI] Error checking consent state, assuming not granted:", error);
    return false;
  }
}

/**
 * Builds user_data object for Meta CAPI without including empty fields.
 */
export function buildUserData(params: {
  email?: string;
  phone?: string;
  fullName?: string;
  userId?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}): IMetaUserData {
  const userData: IMetaUserData = {};

  const hashedEmail = normalizeAndHashEmail(params.email);
  if (hashedEmail) {
    userData.em = [hashedEmail];
  }

  const hashedPhone = normalizeAndHashPhone(params.phone);
  if (hashedPhone) {
    userData.ph = [hashedPhone];
  }

  const { firstName, lastName } = splitName(params.fullName);
  if (firstName) {
    const hashedFn = normalizeAndHashName(firstName);
    if (hashedFn) userData.fn = [hashedFn];
  }
  if (lastName) {
    const hashedLn = normalizeAndHashName(lastName);
    if (hashedLn) userData.ln = [hashedLn];
  }

  if (params.userId && typeof params.userId === "string" && params.userId.trim()) {
    userData.external_id = [sha256Hash(params.userId.trim())];
  }

  // Raw values (DO NOT HASH per Meta documentation)
  if (params.clientIp && typeof params.clientIp === "string" && params.clientIp.trim()) {
    userData.client_ip_address = params.clientIp.trim();
  }

  if (params.userAgent && typeof params.userAgent === "string" && params.userAgent.trim()) {
    userData.client_user_agent = params.userAgent.trim();
  }

  if (params.fbp && typeof params.fbp === "string" && params.fbp.trim()) {
    userData.fbp = params.fbp.trim();
  }

  if (params.fbc && typeof params.fbc === "string" && params.fbc.trim()) {
    userData.fbc = params.fbc.trim();
  }

  return userData;
}

/**
 * Dispatches an event payload directly to the Meta Conversions API.
 * Uses an AbortController timeout and handles network/API errors safely.
 */
export async function sendEventToMeta(
  config: IMetaCapiConfig,
  event: IMetaCapiEventPayload,
): Promise<{ success: boolean; error?: string }> {
  const apiVersion = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
  const endpoint = `https://graph.facebook.com/${apiVersion}/${config.pixelId}/events`;

  const requestBody: Record<string, unknown> = {
    data: [event],
  };

  if (config.testEventCode) {
    requestBody.test_event_code = config.testEventCode;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const json = (await response.json().catch(() => null)) as {
      events_received?: number;
      fbtrace_id?: string;
      error?: { message?: string; type?: string; code?: number };
    } | null;

    if (!response.ok) {
      const sanitizedError = json?.error?.message
        ? `Meta API Error (${json.error.code ?? response.status}): ${json.error.message}`
        : `Meta API returned HTTP status ${response.status}`;
      return { success: false, error: sanitizedError };
    }

    if (json?.error) {
      return {
        success: false,
        error: `Meta API Error (${json.error.code ?? "unknown"}): ${json.error.message ?? "Unknown error"}`,
      };
    }

    return { success: true };
  } catch (error: unknown) {
    clearTimeout(timer);
    const err = error as { name?: string; message?: string };
    if (err.name === "AbortError") {
      return { success: false, error: "Meta API request timed out after 8s." };
    }
    return {
      success: false,
      error: `Meta API network failure: ${err.message || "Unknown error"}`,
    };
  }
}

/**
 * Durably records conversion event in MongoDB outbox and dispatches to Meta CAPI.
 * Safe and non-blocking: never throws error to caller.
 */
export async function recordAndDispatchMetaEvent(params: {
  eventId: string;
  eventName: string;
  entityType: TConversionEntityType;
  entityId: string;
  eventSourceUrl?: string;
  userData: IMetaUserData;
  customData?: Record<string, unknown>;
  marketingConsent?: boolean;
}): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  const {
    eventId,
    eventName,
    entityType,
    entityId,
    eventSourceUrl,
    userData,
    customData,
    marketingConsent,
  } = params;

  try {
    // 1. Deduplication: Check if eventId already exists in outbox
    const existing = await ConversionEvent.findOne({ eventId });
    if (existing) {
      // Event already recorded / dispatched; idempotent return
      return;
    }

    // 2. Validate marketing consent
    const consentGranted = await checkMarketingConsent({
      marketingConsent,
    });

    const eventPayload: IMetaCapiEventPayload = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: sanitizeEventSourceUrl(eventSourceUrl),
      user_data: userData,
      ...(customData ? { custom_data: customData } : {}),
    };

    if (!consentGranted) {
      // Consent not granted; record suppression in outbox for auditability
      await ConversionEvent.create({
        eventId,
        eventName,
        entityType,
        entityId,
        payload: eventPayload,
        status: "suppressed",
        lastError: "Marketing consent required but not granted by user.",
      }).catch((err) => {
        console.warn("[Meta CAPI] Could not record suppressed event:", err);
      });
      return;
    }

    // 3. Retrieve CAPI config
    const config = await getCapiConfig();
    if (!config) {
      // CAPI disabled or not configured; do not create pending requests
      return;
    }

    // 4. Save outbox entry as pending
    let outboxRecord: InstanceType<typeof ConversionEvent>;
    try {
      outboxRecord = await ConversionEvent.create({
        eventId,
        eventName,
        entityType,
        entityId,
        payload: eventPayload,
        status: "pending",
        attempts: 1,
      });
    } catch (createErr: unknown) {
      const err = createErr as { code?: number };
      if (err.code === 11000) {
        // Race condition duplicate eventId, cleanly ignore
        return;
      }
      throw createErr;
    }

    // 5. Send to Meta CAPI
    const dispatchResult = await sendEventToMeta(config, eventPayload);

    if (dispatchResult.success) {
      await ConversionEvent.updateOne(
        { _id: outboxRecord._id },
        {
          $set: {
            status: "dispatched",
            dispatchedAt: new Date(),
            lastError: "",
          },
        },
      ).catch(() => {});
    } else {
      await ConversionEvent.updateOne(
        { _id: outboxRecord._id },
        {
          $set: {
            status: "failed",
            lastError: dispatchResult.error || "Unknown dispatch failure",
          },
        },
      ).catch(() => {});
    }
  } catch (err) {
    // Non-blocking: never fail caller business operation
    console.error("[Meta CAPI] Unexpected error in recordAndDispatchMetaEvent:", err);
  }
}

/**
 * Dispatch Lead conversion event (for Contact Form submission).
 */
export async function dispatchLeadEvent(params: {
  contact: {
    _id: unknown;
    fullName: string;
    email: string;
    phoneNumber: string;
    projectType?: string;
    siteVisitRequired?: boolean;
  };
  context?: IConversionContextInput;
}): Promise<void> {
  const { contact, context } = params;
  const eventId = context?.eventId?.trim() || generateEventId("lead");
  const entityId = String(contact._id);

  const userData = buildUserData({
    email: contact.email,
    phone: contact.phoneNumber,
    fullName: contact.fullName,
    clientIp: context?.clientIp,
    userAgent: context?.userAgent,
    fbp: context?.fbp,
    fbc: context?.fbc,
  });

  const customData: Record<string, unknown> = {
    content_name: "contact_form_submitted",
  };
  if (contact.projectType) {
    customData.project_type = contact.projectType;
  }
  if (typeof contact.siteVisitRequired === "boolean") {
    customData.site_visit_required = contact.siteVisitRequired;
  }

  // Fire and forget
  void recordAndDispatchMetaEvent({
    eventId,
    eventName: "Lead",
    entityType: "contact",
    entityId,
    eventSourceUrl: context?.eventSourceUrl,
    userData,
    customData,
    marketingConsent: context?.marketingConsent,
  });
}

/**
 * Dispatch Schedule conversion event (for Service Booking).
 */
export async function dispatchScheduleEvent(params: {
  booking: {
    _id: unknown;
    bookingNumber: string;
    isSiteVisit?: boolean;
  };
  serviceTitle?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  context?: IConversionContextInput;
}): Promise<void> {
  const { booking, serviceTitle, user, context } = params;
  const eventId = context?.eventId?.trim() || generateEventId("book");
  const entityId = String(booking._id);

  const userData = buildUserData({
    email: user?.email,
    phone: user?.phone,
    fullName: user?.name,
    userId: user?.id,
    clientIp: context?.clientIp,
    userAgent: context?.userAgent,
    fbp: context?.fbp,
    fbc: context?.fbc,
  });

  const customData: Record<string, unknown> = {
    content_name: "consultation_booking_submitted",
    booking_number: booking.bookingNumber,
  };
  if (serviceTitle) {
    customData.service_name = serviceTitle;
  }
  if (typeof booking.isSiteVisit === "boolean") {
    customData.is_site_visit = booking.isSiteVisit;
  }

  // Fire and forget
  void recordAndDispatchMetaEvent({
    eventId,
    eventName: "Schedule",
    entityType: "booking",
    entityId,
    eventSourceUrl: context?.eventSourceUrl,
    userData,
    customData,
    marketingConsent: context?.marketingConsent,
  });
}

/**
 * Dispatch Purchase conversion event (for Ecommerce Order).
 * STRICT: Value must be computed from saved backend order, not client request.
 */
export async function dispatchPurchaseEvent(params: {
  order: {
    _id: unknown;
    orderNumber: string;
    totalAmount: number;
    currency: string;
    items: Array<{
      productId: unknown;
      quantity: number;
      unitPrice: number;
      productName?: string;
    }>;
    customer: {
      name: string;
      phone: string;
      email?: string;
    };
    userId?: string;
  };
  context?: IConversionContextInput;
}): Promise<void> {
  const { order, context } = params;
  const eventId = context?.eventId?.trim() || generateEventId("order");
  const entityId = String(order._id);

  const userData = buildUserData({
    email: order.customer.email,
    phone: order.customer.phone,
    fullName: order.customer.name,
    userId: order.userId,
    clientIp: context?.clientIp,
    userAgent: context?.userAgent,
    fbp: context?.fbp,
    fbc: context?.fbc,
  });

  const contents = order.items.map((item) => ({
    id: String(item.productId),
    quantity: item.quantity,
    item_price: Number(item.unitPrice.toFixed(2)),
  }));

  const numItems = order.items.reduce((acc, item) => acc + item.quantity, 0);

  const customData: Record<string, unknown> = {
    currency: order.currency || "BDT",
    value: Number(order.totalAmount.toFixed(2)),
    content_type: "product",
    contents,
    num_items: numItems,
    order_number: order.orderNumber,
  };

  // Fire and forget
  void recordAndDispatchMetaEvent({
    eventId,
    eventName: "Purchase",
    entityType: "order",
    entityId,
    eventSourceUrl: context?.eventSourceUrl,
    userData,
    customData,
    marketingConsent: context?.marketingConsent,
  });
}

export const metaCapiService = {
  getCapiConfig,
  checkMarketingConsent,
  sendEventToMeta,
  recordAndDispatchMetaEvent,
  dispatchLeadEvent,
  dispatchScheduleEvent,
  dispatchPurchaseEvent,
};
