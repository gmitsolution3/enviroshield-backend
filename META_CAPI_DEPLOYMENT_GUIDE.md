# Meta Conversions API (CAPI) & Pixel Setup and Deployment Guide

This guide details the production architecture, credential configuration, event deduplication, and operational runbook for the Meta Conversions API (CAPI) and Meta Pixel on Enviroshield.

---

## 1. Architecture Overview

Enviroshield implements Meta's recommended **redundant event tracking with browser-server deduplication**:

```
┌────────────────────────────────────────────────────────┐
│                   Visitor's Browser                    │
│                                                        │
│  [User Action: Contact Form / Booking / Checkout]      │
│     │                                                  │
│     ├─ 1. Generate unique eventId (e.g. es_order_...)  │
│     ├─ 2. Capture attribution cookies (_fbp, _fbc)     │
│     │     (only if user marketing consent = granted)   │
│     │                                                  │
│     ├───► [Meta Pixel: fbq('track', 'Purchase', ...)]  │
│     │        ↳ options: { eventID: eventId }           │
│     │                                                  │
│     └───► [API Request: POST /order]                   │
│              ↳ body: { ..., conversionContext }        │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS POST
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Backend Server                       │
│                                                        │
│  1. Authoritative business operation completes:        │
│     - Contact saved to MongoDB                         │
│     - Booking saved with verified user profile         │
│     - Order committed in MongoDB transaction           │
│  2. Consent checked (suppresses event if denied)       │
│  3. Deduplication check in ConversionEvent outbox      │
│  4. Normalize & SHA-256 hash PII (email, phone, name)  │
│  5. Retrieve & decrypt Meta CAPI token (AES-256-GCM)   │
│  6. POST to Meta Graph API v22.0                       │
│        ↳ event_name: 'Purchase'                        │
│        ↳ event_id: eventId  <── MATCHES PIXEL ID       │
│        ↳ action_source: 'website'                      │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS POST
                           ▼
┌────────────────────────────────────────────────────────┐
│                  Meta Graph API                        │
│                                                        │
│  Meta Events Manager receives both browser and server  │
│  events sharing the exact same event_id.               │
│  Meta automatically deduplicates into a single event!  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Environment Variables

Configure these environment variables in your server environment (`backend/.env`):

| Variable Name | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `META_CAPI_ENCRYPTION_KEY` | **Yes (in prod)** | None | 32-byte key (64 hex characters) used to encrypt and decrypt the Meta CAPI token at rest using AES-256-GCM. |
| `META_GRAPH_API_VERSION` | Optional | `v22.0` | Meta Graph API version used for CAPI endpoints (`https://graph.facebook.com/<VERSION>/<PIXEL_ID>/events`). |

> [!IMPORTANT]
> Never commit real access tokens or encryption keys into Git or repository configuration files.

### Generating the Encryption Key

Generate a cryptographically secure 32-byte (256-bit) hexadecimal key on Linux, macOS, or Windows (via OpenSSL or PowerShell):

```bash
# Using OpenSSL:
openssl rand -hex 32

# Using Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated 64-character hex string to your production `.env`:

```env
META_CAPI_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

---

## 3. Meta Access Token Setup via Admin Dashboard

Admins manage the Meta Pixel ID and Conversions API access token directly via the web dashboard without redeploying code.

1. Navigate to: **Dashboard → Settings → Advertising**.
2. Locate the **Meta Pixel & Conversions API (CAPI)** card.
3. Toggle **Enable Meta Pixel** and input your **Meta Pixel ID** (8–20 digits).
4. Under **Meta Conversions API (Server-Side Tracking)**:
   - Toggle **Enable Meta Conversions API**.
   - Paste the System User Access Token generated from Meta Events Manager.
   - (Optional) Paste your **Test Event Code** (e.g. `TEST12345`) while verifying.
5. Click **Save Settings**.
6. The system will encrypt the token at rest using AES-256-GCM and store it in MongoDB. The input field will clear and display a green **Token Configured** badge.

### Generating an Access Token in Meta Events Manager

1. Open [Meta Events Manager](https://business.facebook.com/events_manager2).
2. Select your Pixel dataset under **Data Sources**.
3. Go to the **Settings** tab.
4. Scroll to **Conversions API** → **Set up directly** → click **Generate access token**.
5. Copy the generated token string (`EAAB...`) and paste it into the Enviroshield Admin Dashboard.

---

## 4. Tracked Conversions & Deduplication Contract

| User Action | Meta Event Name | Browser Pixel Trigger | Server CAPI Trigger | Deduplication Key (`event_id`) |
| :--- | :--- | :--- | :--- | :--- |
| **Contact Form** | `Lead` | Upon HTTP 201 response | After `Contact.create()` | `es_lead_<timestamp>_<random>` |
| **Service Booking** | `Schedule` | Upon HTTP 201 response | After `Booking.create()` | `es_book_<timestamp>_<random>` |
| **Ecommerce Order** | `Purchase` | Upon HTTP 201 response | After MongoDB order transaction commits | `es_order_<timestamp>_<random>` |

### Why This Deduplication Architecture Is Reliable:
1. **Single Event ID Generation:** The unique `eventId` is created once in the client before submitting the request, sent in `conversionContext.eventId`, and fired in `fbq('track', ..., { eventID })`.
2. **Authoritative Server Payload:** The backend uses verified, committed database records for revenue (`totalAmount`), order items, and user identities.
3. **No Refresh Duplication:** The `/checkout/success` and `/services/booking-success` landing pages do not re-emit `Purchase` or `Schedule` events.
4. **Idempotency Outbox:** The backend `ConversionEvent` collection indexes `eventId` uniquely, preventing duplicate dispatches on network retries.

---

## 5. Testing & Verification Runbook

### Step 1: Using the Meta Test Event Code
1. In Meta Events Manager, click your Pixel → **Test Events** tab.
2. Note your code (e.g. `TEST45678`).
3. In the Enviroshield Admin Dashboard (**Settings → Advertising**), enter `TEST45678` into **Test Event Code**.
4. Save settings.

### Step 2: Trigger Test Conversions
- **Lead:** Fill out and submit `/contact`.
- **Schedule:** Log in and submit `/services/<slug>/book`.
- **Purchase:** Add a product to the cart, check out, and place an order.

### Step 3: Inspect Meta Events Manager
1. Look at the **Test Events** stream in Events Manager.
2. Verify both **Browser** and **Server** events appear with status **Deduplicated**.
3. Verify customer information parameters (email, phone, name) show as hashed.
4. Verify custom parameters (`currency: "BDT"`, `value`, `content_name`).

### Step 4: Promote to Production
Clear the **Test Event Code** field in the Admin Dashboard and click **Save Settings** so live visitor events flow into production analytics.

---

## 6. Privacy & Consent Enforcement

Enviroshield strictly respects visitor cookie consent:
- **Cookie Consent Banner:** Visitors can accept or decline **Marketing** cookies.
- **Client Gate:** When marketing consent is denied or not yet decided, `fbq('consent', 'revoke')` is enforced and browser pixel events do not fire.
- **Server Gate:** The backend checks `settings.consent.requireMarketingConsent`. If marketing consent was denied by the user, the server event is flagged as `suppressed` in the outbox and is **never** sent to Meta.

---

## 7. Key Rotation & Maintenance Runbook

### Rotating the Meta CAPI Access Token
1. Go to **Meta Events Manager → Settings → Conversions API**.
2. Generate a new System User access token.
3. Go to **Enviroshield Admin Dashboard → Settings → Advertising**.
4. Paste the new token into the **Meta CAPI Access Token** field.
5. Click **Save Settings**. The previous token is overwritten with the newly encrypted token.

### Rotating the `META_CAPI_ENCRYPTION_KEY`
1. In the Enviroshield Admin Dashboard, temporarily enter your current access token or re-save after updating the environment variable.
2. If changing the server key, update `META_CAPI_ENCRYPTION_KEY` in your hosting provider (e.g., Railway, Docker, PM2) and restart the service.
3. Save the access token in the Admin Dashboard to re-encrypt it with the new key.

### What to Do When Meta API Requests Fail
- **Main user experience is protected:** All CAPI calls run asynchronously via `metaCapiService`. Failures will never fail a contact inquiry, service booking, or customer order.
- **Inspect Outbox Records:** Query the `conversionevents` MongoDB collection:
  ```json
  db.conversionevents.find({ status: "failed" }).sort({ createdAt: -1 })
  ```
- Errors are sanitized and recorded in `lastError` (e.g. invalid parameter, token expired, or rate limit) without logging customer PII.
