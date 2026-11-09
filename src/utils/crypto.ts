import crypto from "crypto";
import httpStatus from "http-status";
import { AppError } from "./AppError";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes recommended for GCM
const VERSION_PREFIX = "v1";

/**
 * Derives a 32-byte buffer key from the META_CAPI_ENCRYPTION_KEY environment variable.
 * Supports 64-hex-character string (recommended), 44-character base64 string, or 32-byte utf-8 string.
 */
export function getEncryptionKey(): Buffer {
  const rawKey = process.env.META_CAPI_ENCRYPTION_KEY;

  if (!rawKey || rawKey.trim().length === 0) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Meta CAPI encryption key (META_CAPI_ENCRYPTION_KEY) is not configured. Please generate a 32-byte key using 'openssl rand -hex 32' and add it to your environment variables.",
    );
  }

  const trimmed = rawKey.trim();

  // 64 hex characters = 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  // Base64 32 bytes = 44 characters
  if (/^[A-Za-z0-9+/]{43}=$/.test(trimmed)) {
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length === 32) return buf;
  }

  // Raw 32-character utf-8 string
  const utf8Buf = Buffer.from(trimmed, "utf8");
  if (utf8Buf.length === 32) {
    return utf8Buf;
  }

  throw new AppError(
    httpStatus.INTERNAL_SERVER_ERROR,
    `Invalid META_CAPI_ENCRYPTION_KEY length (${utf8Buf.length} bytes). The key must be exactly 32 bytes (64 hex characters or 32 raw characters). Generate with 'openssl rand -hex 32'.`,
  );
}

/**
 * Checks whether META_CAPI_ENCRYPTION_KEY is present and properly configured.
 */
export function isEncryptionKeyConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.trim().length === 0) {
    return "";
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return `${VERSION_PREFIX}:${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Supports versioned format: v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || encryptedText.trim().length === 0) {
    return "";
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Invalid or unsupported encrypted payload format for Meta CAPI token.",
    );
  }

  const [, ivHex, tagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  if (iv.length !== IV_LENGTH || tag.length !== 16) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Malformed encrypted payload components for Meta CAPI token.",
    );
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to decrypt Meta CAPI token. Ensure the correct encryption key is in use.",
    );
  }
}
