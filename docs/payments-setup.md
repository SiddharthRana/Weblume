# Payments setup

Weblume sells one paid plan (Starter, monthly or annual) through two channels that grant the same entitlements:

| Channel                                                    | Who it's for                                                                 | How it works                                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Web** — a Merchant of Record (Paddle _or_ Dodo Payments) | Website visitors, worldwide                                                  | Hosted checkout → signed webhooks → `subscriptions`                                                                   |
| **Google Play Billing**                                    | Android app users (required by Play policy for in-app digital subscriptions) | Purchase in app → server verifies with Google and acknowledges → Real-time Developer Notifications keep state current |

Everything below uses **sandbox/test** modes. Nothing is charged until you switch to live keys.

## 0. Before you start: choose the web provider

A Merchant of Record (MoR) is the legal seller: it charges the customer, handles VAT/GST/sales tax worldwide, issues invoices and handles refunds and chargebacks. The two adapters built in are:

|                                     | Paddle Billing                                                                                                                                                                      | Dodo Payments                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seller based in India               | **Not confirmed** — no official Paddle statement found; third-party sources say Indian sellers can apply and are reviewed individually, with payouts in USD/EUR/GBP rather than INR | Yes — India-based company, built for Indian founders selling globally                                                                             |
| Indian buyers: UPI / RuPay          | Not found                                                                                                                                                                           | Yes, including UPI AutoPay subscriptions (RBI e-mandates)                                                                                         |
| International cards & local methods | Yes                                                                                                                                                                                 | Yes                                                                                                                                               |
| Adapter status                      | Built against Paddle's well-documented API and webhook signature format                                                                                                             | Built on the Standard Webhooks signature spec and Dodo's documented field names; **not verified against the live API** from the build environment |

These findings come from a web search on 2026-10-30. The official provider pages couldn't be opened from the build environment, so **confirm with each provider** before you sign up:

1. They accept a seller in your country, with your business type (individual / sole proprietor / company).
2. They support recurring payments for Indian buyers (RBI e-mandate / UPI AutoPay).
3. INR pricing and your payout currency.

Lemon Squeezy wasn't implemented: for India, payouts appear to be PayPal-only, because Stripe India accounts have been invite-only since May 2024.

Set `WEB_PAYMENT_PROVIDER=paddle` or `dodo` in the API env. Only one web provider is active at a time.

**Decision (2026-11-04): launch with Dodo.** At ₹149 a month, fixed fees dominate: Paddle's 5% + 50¢ takes about a third of each payment (and Paddle routes products under $10 to custom pricing), while Dodo's India rate of about 4% + 15¢ plus 0.5% for subscriptions takes about 13%. Both are Merchants of Record, so GST and foreign taxes are handled for us. Razorpay (about 2% + GST on the fee) would be much cheaper for Indian buyers but isn't a Merchant of Record and has no adapter yet; revisit it once revenue makes the fee gap worth the tax work. Fee figures came from third-party 2026 sources; confirm on each provider's pricing page.

## 1. Plans and prices

- **Plan limits** live in `packages/shared/src/plans.ts`.
- **Prices** live in each provider's dashboard. Create, per provider:
  - **Starter monthly**: ₹149 / $3.99 (use the provider's per-country or localised pricing for INR vs USD)
  - **Starter annual**: ₹1,199 / $29.99
- Put the resulting IDs in the API env:
  - **Paddle:** `PADDLE_PRICE_STARTER_MONTHLY` and `PADDLE_PRICE_STARTER_ANNUAL` (price IDs, `pri_…`)
  - **Dodo:** `DODO_PRODUCT_STARTER_MONTHLY` and `DODO_PRODUCT_STARTER_ANNUAL` (product IDs)
- Decide whether displayed prices **include tax**, and make the pricing page match. Paddle and Dodo can show tax-inclusive prices per country.

## 2. Paddle (sandbox)

1. Create a sandbox account at sandbox-vendors.paddle.com.
2. **Catalog:** create the product "Weblume Starter" with two prices (monthly, annual). Copy the price IDs.
3. **Developer tools → Authentication:**
   - Create an **API key** → `PADDLE_API_KEY` (API, server-only).
   - Create a **client-side token** → `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (web), and set `NEXT_PUBLIC_PADDLE_ENV=sandbox`.
4. **Checkout → Checkout settings → Default payment link:** `https://<your-site>/checkout/paddle`. Also add your domain to the approved domains. The API creates a transaction carrying the user id, and Paddle sends the customer to this page, which opens Paddle.js.
5. **Developer tools → Notifications:** create a destination with URL `https://<your-api>/v1/billing/webhooks/paddle`. Subscribe to these events, then copy the secret key into `PADDLE_WEBHOOK_SECRET`:
   - `subscription.created`
   - `subscription.activated`
   - `subscription.updated`
   - `subscription.trialing`
   - `subscription.past_due`
   - `subscription.paused`
   - `subscription.resumed`
   - `subscription.canceled`
6. **Customer portal:** enabled by default. The account page links to it.
7. Test with Paddle's sandbox test cards, then check **Account** in the web app shows Starter.

## 3. Dodo Payments (test mode)

1. Create an account, complete business verification, and stay in **Test mode**.
2. **Products:** create subscription products "Starter monthly" and "Starter annual". Copy the product IDs.
3. **Developer → API keys:** create a key → `DODO_API_KEY`, and set `DODO_ENV=test`.
4. **Developer → Webhooks:** add `https://<your-api>/v1/billing/webhooks/dodo`. Subscribe to the `subscription.*` events, then copy the signing secret (`whsec_…`) into `DODO_WEBHOOK_SECRET`.
5. Run one test purchase end to end. The paths and fields were checked against Dodo's API reference on 2026-11-04 (checkout `POST /checkouts` → `checkout_url`, portal `POST /customers/{id}/customer-portal/session` → `link`, Standard Webhooks headers, subscription statuses including `past_due` and `paused`). One thing the docs don't promise is that checkout `metadata.user_id` is copied onto the subscription, so the API falls back to matching the payer's email to a Weblume account. In the test purchase, check:
   - **Checkout:** a checkout URL comes back, and the payment completes.
   - **Webhook:** the API logs a processed `subscription.active` event, and **Account** shows Starter.
   - **Portal:** "Manage subscription" opens the customer portal.
   - **Fixing differences:** if field names differ, adjust `apps/api/src/billing/providers/dodo.provider.ts` and its tests.

## 4. Google Play Billing

### Play Console

1. Create the app with package name `com.weblume.app`, and upload a release (internal testing track is fine) built with the release keystore (see `apps/mobile/README.md`). Play only offers billing to apps that have been uploaded.
2. **Monetize → Products → Subscriptions:**
   - Create subscription **`weblume_starter`**. It must match `GOOGLE_PLAY_SUBSCRIPTION_ID`.
   - Add two base plans, IDs **`monthly`** (auto-renewing, 1 month) and **`annual`** (auto-renewing, 1 year). The app and server map base-plan IDs containing "month" / "annual" or "year" to intervals.
   - Set prices per country, e.g. India ₹149 / ₹1,199, US $3.99 / $29.99. Activate both base plans.
3. **Setup → License testing:** add tester accounts so test purchases aren't charged.

### Google Cloud: server access

1. In the Google Cloud project linked to Play Console, enable the **Google Play Android Developer API**.
2. Create a service account and a JSON key. Put the JSON (raw or base64) in **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`**. It's an API-only secret.
3. **Play Console → Users and permissions:** invite the service account email with **View financial data** and **Manage orders and subscriptions**.
4. Set **`BILLING_ACCOUNT_SECRET`** to at least 32 random characters (`openssl rand -hex 32`). It derives the opaque account id sent to Play with each purchase. Changing it later breaks matching for existing Play subscriptions, so set it once.

### Real-time Developer Notifications (RTDN)

1. **Pub/Sub:**
   - Create a topic, e.g. `play-billing`.
   - Grant `google-play-developer-notifications@system.gserviceaccount.com` the **Pub/Sub Publisher** role on it.
2. **Play Console → Monetization setup:** set the topic name and send a test notification. It's logged and ignored.
3. **Push subscription to the API:**
   - Create a push subscription on the topic. Endpoint: `https://<your-api>/v1/billing/google-play/rtdn`.
   - Enable **authentication** with a service account, e.g. `pubsub-push@<project>.iam.gserviceaccount.com`, and audience `https://<your-api>/v1/billing/google-play/rtdn`.
   - Set the same values in **`GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT`** and **`GOOGLE_PLAY_RTDN_AUDIENCE`**. The API rejects pushes without a matching Google-signed token.

### How a Play purchase flows

1. The app asks the API for the user's account reference (`GET /v1/billing/google-play/account-ref`) and starts the purchase with it as `obfuscatedAccountId`.
2. Play returns a purchase token. The app sends it to `POST /v1/billing/google-play/verify`.
3. The API reads `purchases.subscriptionsv2` from Google and checks:
   - the product is ours;
   - the purchase's account reference matches the signed-in user, so a token can't be claimed by another account.

   It then saves the subscription and **acknowledges** the purchase. Unacknowledged purchases are refunded by Google after 3 days.

4. The app only finishes the purchase on the device after that succeeds. If the app is killed mid-way, Play redelivers the purchase on next launch, and RTDN also acknowledges it as a fallback.
5. Renewals, grace periods, holds, pauses, cancellations, expiries and refunds (`SUBSCRIPTION_REVOKED` → `refunded`) arrive via RTDN. The API re-reads the subscription from Google each time, because the API, not the notification, is the source of truth.

## 5. Switching billing on

1. Set the env vars above and redeploy.
2. Flip the kill switch: `update public.feature_flags set enabled = true where key = 'billing';`. It takes effect within 30 seconds.
3. `GET /v1/billing/config` shows what's available per channel. The pricing page, account page and app read it.

Switching `billing` off again stops new checkouts **and** makes everyone Free (entitlements ignore subscriptions while it's off). Use it only before launch or in an emergency.

## 6. Behaviour reference

- **Entitlements** come only from `subscriptions` rows written by verified events (`apps/api/src/billing/subscription-store.ts`). Status → access rules are in `docs/scoring.md` and `packages/shared/src/plans.ts`.
- **Idempotency:** each provider event ID (Pub/Sub `messageId` for Play) is stored once in `webhook_events`. Duplicates return `{"status":"duplicate"}`.
- **Out-of-order events:** a row is updated only if the event is newer than the last applied one (`last_event_at`).
- **Failures** return 5xx so the provider retries. Signature failures return 401 and nothing is recorded.
- **Two channels at once:** web checkout is refused if any active subscription exists. The app hides purchase options when there's an active web subscription. If someone still ends up with both (e.g. buys on web, then on another device), both the web and app account pages warn them to cancel one.
- **iOS:** no App Store purchases until iOS is in scope.
