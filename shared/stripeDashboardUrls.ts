/**
 * Stripe Dashboard deep links for owners completing platform Connect setup.
 *
 * Client override: set `VITE_STRIPE_DASHBOARD_CONNECT_SETTINGS_URL` in `.env` (e.g. test-mode
 * `https://dashboard.stripe.com/test/settings/connect`) if you need a fixed URL.
 */

/** Default: Connect settings (live/test context follows the account you’re logged into in Stripe). */
export const STRIPE_DASHBOARD_CONNECT_SETTINGS_URL_DEFAULT =
  "https://dashboard.stripe.com/settings/connect";
