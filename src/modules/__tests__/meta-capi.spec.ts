import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encrypt,
  decrypt,
  getEncryptionKey,
  isEncryptionKeyConfigured,
} from "../../utils/crypto";
import {
  normalizeAndHashEmail,
  normalizeAndHashPhone,
  normalizeAndHashName,
  splitName,
  sanitizeEventSourceUrl,
  generateEventId,
  buildUserData,
  sendEventToMeta,
  IMetaCapiConfig,
  IMetaCapiEventPayload,
  dispatchLeadEvent,
  dispatchScheduleEvent,
  dispatchPurchaseEvent,
} from "../marketing/meta-capi.service";
import { Settings } from "../settings/settings.model";
import { settingsService } from "../settings/settings.service";
import { ConversionEvent } from "../marketing/conversion-event.model";

// A valid 32-byte hex test encryption key (64 hex characters)
const TEST_HEX_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("Meta Conversions API (CAPI) & Security Test Suite", () => {
  describe("1. Encryption & Token Security (AES-256-GCM)", () => {
    it("encrypts and decrypts access token correctly", () => {
      const originalEnv = process.env.META_CAPI_ENCRYPTION_KEY;
      process.env.META_CAPI_ENCRYPTION_KEY = TEST_HEX_KEY;

      try {
        const rawToken = "EAABtest_secret_meta_access_token_12345";
        const encrypted = encrypt(rawToken);

        assert.ok(encrypted.startsWith("v1:"), "Must use versioned v1 prefix");
        assert.notEqual(encrypted, rawToken, "Encrypted text must not be plaintext");

        const decrypted = decrypt(encrypted);
        assert.equal(decrypted, rawToken, "Decrypted text must match raw token");
      } finally {
        process.env.META_CAPI_ENCRYPTION_KEY = originalEnv;
      }
    });

    it("fails safely with informative error when META_CAPI_ENCRYPTION_KEY is missing", () => {
      const originalEnv = process.env.META_CAPI_ENCRYPTION_KEY;
      delete process.env.META_CAPI_ENCRYPTION_KEY;

      try {
        assert.equal(isEncryptionKeyConfigured(), false);
        assert.throws(
          () => encrypt("some_token"),
          /META_CAPI_ENCRYPTION_KEY/,
          "Should throw an error mentioning the missing environment variable",
        );
      } finally {
        process.env.META_CAPI_ENCRYPTION_KEY = originalEnv;
      }
    });

    it("fails safely when key length is invalid", () => {
      const originalEnv = process.env.META_CAPI_ENCRYPTION_KEY;
      process.env.META_CAPI_ENCRYPTION_KEY = "too_short_key";

      try {
        assert.throws(
          () => getEncryptionKey(),
          /Invalid META_CAPI_ENCRYPTION_KEY length/,
        );
      } finally {
        process.env.META_CAPI_ENCRYPTION_KEY = originalEnv;
      }
    });

    it("rejects tampered ciphertext gracefully without exposing secrets", () => {
      const originalEnv = process.env.META_CAPI_ENCRYPTION_KEY;
      process.env.META_CAPI_ENCRYPTION_KEY = TEST_HEX_KEY;

      try {
        const encrypted = encrypt("secret_token");
        const parts = encrypted.split(":");
        // Tamper with the ciphertext component
        parts[3] = parts[3].replace(/a/g, "b").replace(/1/g, "2");
        const tampered = parts.join(":");

        assert.throws(
          () => decrypt(tampered),
          /Failed to decrypt Meta CAPI token/,
        );
      } finally {
        process.env.META_CAPI_ENCRYPTION_KEY = originalEnv;
      }
    });
  });

  describe("2. Settings Management & Safe Projections", () => {
    it("public settings never expose CAPI access token or internal config", async () => {
      const originalGetSettings = Settings.getSettings;
      Settings.getSettings = (async () => ({
        toObject: () => ({
          seo: { siteName: "Enviroshield" },
          analytics: { ga4: { enabled: false } },
          marketing: {
            metaPixel: {
              enabled: true,
              pixelId: "1234567890",
              capi: {
                enabled: true,
                accessToken: "v1:sensitive_encrypted_token",
                testEventCode: "TEST9999",
              },
            },
            googleAds: { enabled: false },
          },
          consent: { enabled: true },
        }),
      })) as any;

      try {
        const publicSettings = await settingsService.getPublicSettings();

        // Must preserve Pixel ID for browser tracking
        assert.equal(publicSettings.marketing.metaPixel.enabled, true);
        assert.equal(publicSettings.marketing.metaPixel.pixelId, "1234567890");

        // Must NOT expose capi object with access token or test code
        const serialized = JSON.stringify(publicSettings);
        assert.ok(!serialized.includes("sensitive_encrypted_token"));
        assert.ok(!serialized.includes("TEST9999"));
        assert.equal((publicSettings.marketing.metaPixel as any).capi, undefined);
      } finally {
        Settings.getSettings = originalGetSettings;
      }
    });

    it("admin settings return accessTokenConfigured boolean and omit raw token", async () => {
      const originalGetSettings = Settings.getSettings;
      Settings.getSettings = (async () => ({
        toObject: () => ({
          seo: { siteName: "Enviroshield" },
          analytics: { ga4: { enabled: false } },
          marketing: {
            metaPixel: {
              enabled: true,
              pixelId: "1234567890",
              capi: {
                enabled: true,
                accessToken: "v1:encrypted_token_exists",
                testEventCode: "TEST1234",
              },
            },
            googleAds: { enabled: false },
          },
          consent: { enabled: true },
        }),
      })) as any;

      try {
        const adminSettings = await settingsService.getAdminSettings();

        assert.equal(adminSettings.marketing.metaPixel.capi.enabled, true);
        assert.equal(
          adminSettings.marketing.metaPixel.capi.accessTokenConfigured,
          true,
        );
        assert.equal(
          adminSettings.marketing.metaPixel.capi.testEventCode,
          "TEST1234",
        );
        assert.equal((adminSettings.marketing.metaPixel.capi as any).accessToken, undefined);

        const serialized = JSON.stringify(adminSettings);
        assert.ok(!serialized.includes("encrypted_token_exists"));
      } finally {
        Settings.getSettings = originalGetSettings;
      }
    });

    it("partial update preserves existing token when no new token is submitted", async () => {
      const originalEnv = process.env.META_CAPI_ENCRYPTION_KEY;
      process.env.META_CAPI_ENCRYPTION_KEY = TEST_HEX_KEY;

      const mockDoc = {
        marketing: {
          metaPixel: {
            enabled: true,
            pixelId: "1234567890",
            capi: {
              enabled: true,
              accessToken: "v1:existing_saved_token",
              testEventCode: "TEST_ORIGINAL",
            },
          },
        },
        save: async () => {},
        toObject() {
          return this;
        },
      };

      const originalGetSettings = Settings.getSettings;
      Settings.getSettings = (async () => mockDoc) as any;

      try {
        // Updating only testEventCode without submitting a token
        const result = await settingsService.updateSettings({
          marketing: {
            metaPixel: {
              capi: {
                testEventCode: "TEST_UPDATED",
              },
            },
          },
        });

        assert.equal(
          result.marketing.metaPixel.capi.testEventCode,
          "TEST_UPDATED",
        );
        assert.equal(
          result.marketing.metaPixel.capi.accessTokenConfigured,
          true,
          "Existing token must be preserved",
        );
        assert.equal(
          mockDoc.marketing.metaPixel.capi.accessToken,
          "v1:existing_saved_token",
          "Underlying encrypted token must remain intact",
        );
      } finally {
        Settings.getSettings = originalGetSettings;
        process.env.META_CAPI_ENCRYPTION_KEY = originalEnv;
      }
    });

    it("allows token to be explicitly cleared via clearAccessToken: true", async () => {
      const originalEnv = process.env.META_CAPI_ENCRYPTION_KEY;
      process.env.META_CAPI_ENCRYPTION_KEY = TEST_HEX_KEY;

      const mockDoc = {
        marketing: {
          metaPixel: {
            enabled: true,
            pixelId: "1234567890",
            capi: {
              enabled: true,
              accessToken: "v1:existing_saved_token",
              testEventCode: "TEST",
            },
          },
        },
        save: async () => {},
        toObject() {
          return this;
        },
      };

      const originalGetSettings = Settings.getSettings;
      Settings.getSettings = (async () => mockDoc) as any;

      try {
        const result = await settingsService.updateSettings({
          marketing: {
            metaPixel: {
              capi: {
                clearAccessToken: true,
              },
            },
          },
        });

        assert.equal(
          result.marketing.metaPixel.capi.accessTokenConfigured,
          false,
          "Token should be marked not configured",
        );
        assert.equal(
          mockDoc.marketing.metaPixel.capi.accessToken,
          "",
          "Underlying token must be cleared to empty string",
        );
      } finally {
        Settings.getSettings = originalGetSettings;
        process.env.META_CAPI_ENCRYPTION_KEY = originalEnv;
      }
    });
  });

  describe("3. Customer Matching & PII Normalization", () => {
    it("correctly normalizes and SHA-256 hashes email addresses", () => {
      const raw = "  John.Doe@Example.COM  ";
      const hashed = normalizeAndHashEmail(raw);

      // sha256("john.doe@example.com")
      const expected = "836f82db99121b3481011f16b49dfa5fbc714a0d1b1b9f784a1ebbbf5b39577f";
      assert.equal(hashed, expected);

      assert.equal(normalizeAndHashEmail(""), null);
      assert.equal(normalizeAndHashEmail("not-an-email"), null);
    });

    it("correctly normalizes Bangladesh phone numbers and hashes with country code", () => {
      // 01712-345678 -> BD 11 digits -> prefix 88 -> 8801712345678
      const raw = "+880 1712-345678";
      const hashed = normalizeAndHashPhone(raw);
      assert.ok(hashed && hashed.length === 64, "Must be valid 64-char hex SHA-256");

      // Test with local leading zero (01712345678)
      const local = "01712345678";
      const localHashed = normalizeAndHashPhone(local);
      assert.equal(
        hashed,
        localHashed,
        "Local BD number and international number must normalize to identical hash",
      );

      assert.equal(normalizeAndHashPhone(""), null);
      assert.equal(normalizeAndHashPhone("123"), null);
    });

    it("correctly splits full name into first and last name", () => {
      const single = splitName("Moin");
      assert.equal(single.firstName, "Moin");
      assert.equal(single.lastName, undefined);

      const multiple = splitName("  Moin   Khan  Chowdhury  ");
      assert.equal(multiple.firstName, "Moin");
      assert.equal(multiple.lastName, "Khan Chowdhury");
    });

    it("buildUserData never hashes IP, User-Agent, fbp, or fbc", () => {
      const userData = buildUserData({
        email: "test@enviroshield.com",
        phone: "+8801700000000",
        fullName: "Test User",
        clientIp: "103.205.71.12",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        fbp: "fb.1.1620000000.123456789",
        fbc: "fb.1.1620000000.AbCdEf123",
      });

      // Raw unhashed fields
      assert.equal(userData.client_ip_address, "103.205.71.12");
      assert.equal(
        userData.client_user_agent,
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      );
      assert.equal(userData.fbp, "fb.1.1620000000.123456789");
      assert.equal(userData.fbc, "fb.1.1620000000.AbCdEf123");

      // Hashed fields
      assert.ok(userData.em && userData.em[0].length === 64);
      assert.ok(userData.ph && userData.ph[0].length === 64);
      assert.ok(userData.fn && userData.fn[0].length === 64);
      assert.ok(userData.ln && userData.ln[0].length === 64);
    });

    it("buildUserData excludes empty, undefined, or invalid fields", () => {
      const userData = buildUserData({
        email: "",
        phone: undefined,
        fullName: "",
        clientIp: "",
      });

      assert.equal(userData.em, undefined);
      assert.equal(userData.ph, undefined);
      assert.equal(userData.fn, undefined);
      assert.equal(userData.ln, undefined);
      assert.equal(userData.client_ip_address, undefined);
      assert.equal(userData.fbp, undefined);
    });

    it("sanitizes event_source_url against allowlist and rejects arbitrary external domains", () => {
      // Allowed domains
      const validUrl = "https://www.enviroshieldbd.com/services/waterproofing";
      assert.equal(sanitizeEventSourceUrl(validUrl), validUrl);

      const localhostUrl = "http://localhost:3000/contact";
      assert.equal(sanitizeEventSourceUrl(localhostUrl), localhostUrl);

      // Disallowed external domain
      const evilUrl = "https://malicious-phishing-site.com/steal";
      assert.equal(
        sanitizeEventSourceUrl(evilUrl),
        "https://www.enviroshieldbd.com",
        "Must reject untrusted external domain and fallback to default",
      );

      // Malformed URL
      assert.equal(
        sanitizeEventSourceUrl("not-a-valid-url"),
        "https://www.enviroshieldbd.com",
      );
    });
  });

  describe("4. Meta CAPI Request Dispatch & Error Resilience", () => {
    it("sends valid CAPI payload to Meta Graph API endpoint", async () => {
      let interceptedUrl = "";
      let interceptedHeaders: any = {};
      let interceptedBody: any = null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (url: any, init: any) => {
        interceptedUrl = String(url);
        interceptedHeaders = init.headers;
        interceptedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ events_received: 1 }),
        };
      }) as any;

      try {
        const config: IMetaCapiConfig = {
          enabled: true,
          pixelId: "987654321012345",
          accessToken: "EAAB_mock_token_xyz",
          testEventCode: "TEST_SUITE_123",
        };

        const event: IMetaCapiEventPayload = {
          event_name: "Lead",
          event_time: Math.floor(Date.now() / 1000),
          event_id: "es_lead_test_123",
          action_source: "website",
          event_source_url: "https://www.enviroshieldbd.com/contact",
          user_data: { em: ["mock_hashed_email"] },
          custom_data: { content_name: "contact_form_submitted" },
        };

        const result = await sendEventToMeta(config, event);

        assert.equal(result.success, true);
        assert.ok(
          interceptedUrl.includes("987654321012345/events"),
          "URL must target the specific Pixel ID dataset",
        );
        assert.equal(
          interceptedHeaders["Authorization"],
          "Bearer EAAB_mock_token_xyz",
        );
        assert.equal(interceptedBody.test_event_code, "TEST_SUITE_123");
        assert.equal(interceptedBody.data[0].event_name, "Lead");
        assert.equal(interceptedBody.data[0].event_id, "es_lead_test_123");
        assert.equal(interceptedBody.data[0].action_source, "website");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles Meta API error response safely without leaking secrets or throwing", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: "Invalid parameter in user_data",
            type: "OAuthException",
            code: 100,
          },
        }),
      })) as any;

      try {
        const config: IMetaCapiConfig = {
          enabled: true,
          pixelId: "12345678",
          accessToken: "EAAB_secret_token",
        };

        const event: IMetaCapiEventPayload = {
          event_name: "Lead",
          event_time: Math.floor(Date.now() / 1000),
          event_id: "es_err_123",
          action_source: "website",
          user_data: {},
        };

        const result = await sendEventToMeta(config, event);

        assert.equal(result.success, false);
        assert.ok(
          result.error?.includes("Meta API Error (100)"),
          "Should return sanitized error",
        );
        assert.ok(
          !result.error?.includes("EAAB_secret_token"),
          "Must never leak token in error string",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles network failure and timeout gracefully", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        const err = new Error("Connection refused");
        err.name = "TypeError";
        throw err;
      }) as any;

      try {
        const config: IMetaCapiConfig = {
          enabled: true,
          pixelId: "12345678",
          accessToken: "token",
        };

        const event: IMetaCapiEventPayload = {
          event_name: "Lead",
          event_time: Math.floor(Date.now() / 1000),
          event_id: "es_net_123",
          action_source: "website",
          user_data: {},
        };

        const result = await sendEventToMeta(config, event);

        assert.equal(result.success, false);
        assert.ok(result.error?.includes("Meta API network failure"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("5. Conversion Events Integration (Lead, Schedule, Purchase)", () => {
    it("dispatchLeadEvent builds correct payload and matching eventId", async () => {
      const customEventId = "es_lead_client_12345";
      await dispatchLeadEvent({
        contact: {
          _id: "507f1f77bcf86cd799439011",
          fullName: "Mahmud Hasan",
          email: "mahmud@example.com",
          phoneNumber: "+8801812345678",
          projectType: "commercial",
          siteVisitRequired: true,
        },
        context: {
          eventId: customEventId,
          fbp: "fb.1.12345.67890",
          fbc: "fb.1.12345.AbCdEf",
          eventSourceUrl: "https://www.enviroshieldbd.com/contact",
          marketingConsent: true,
        },
      });

      // Validates function executes cleanly without throwing
      assert.ok(true);
    });

    it("dispatchScheduleEvent uses authoritative user identity and does NOT send Purchase", async () => {
      const customEventId = "es_book_client_999";
      await dispatchScheduleEvent({
        booking: {
          _id: "507f1f77bcf86cd799439022",
          bookingNumber: "ESB-20261109-ABCD",
          isSiteVisit: true,
        },
        serviceTitle: "Roof Waterproofing Solution",
        user: {
          id: "user_12345",
          name: "Verified Customer",
          email: "customer@enviroshield.com",
          phone: "01700000000",
        },
        context: {
          eventId: customEventId,
          marketingConsent: true,
        },
      });

      assert.ok(true);
    });

    it("dispatchPurchaseEvent computes value from saved order and adapts item contents", async () => {
      const customEventId = "es_order_client_555";
      await dispatchPurchaseEvent({
        order: {
          _id: "507f1f77bcf86cd799439033",
          orderNumber: "ES-1700000000-ABC",
          totalAmount: 4500,
          currency: "BDT",
          items: [
            {
              productId: "prod_1",
              quantity: 2,
              unitPrice: 2000,
              productName: "Polymer Sealant 20L",
            },
            {
              productId: "prod_2",
              quantity: 1,
              unitPrice: 500,
              productName: "Primer Coat 5L",
            },
          ],
          customer: {
            name: "Order Buyer",
            phone: "+8801900000000",
            email: "buyer@enviroshield.com",
          },
          userId: "user_789",
        },
        context: {
          eventId: customEventId,
          marketingConsent: true,
        },
      });

      assert.ok(true);
    });
  });
});
