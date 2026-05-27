/**
 * src/services/errorReporting.js
 *
 * Crash and error reporting via Sentry.
 *
 * Setup:
 *   npm install @sentry/react-native
 *   npx @sentry/wizard@latest -i reactNative
 *
 * Set SENTRY_DSN in your CI environment or .env (never commit the DSN to git).
 * In development, Sentry is disabled so errors appear in the Metro console only.
 */

let SentryLib = null;

async function getSentry() {
  if (SentryLib) return SentryLib;
  try {
    SentryLib = require('@sentry/react-native');
    return SentryLib;
  } catch {
    return null;
  }
}

/**
 * Initialise Sentry. Call once in App.js before rendering the tree.
 * No-op if @sentry/react-native is not installed or DSN is not configured.
 */
export async function initErrorReporting() {
  if (__DEV__) return;  // Sentry off in development

  const Sentry = await getSentry();
  if (!Sentry) return;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[ErrorReporting] SENTRY_DSN not set — crash reporting disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment:       __DEV__ ? 'development' : 'production',
    tracesSampleRate:  0.2,   // 20% of transactions for performance monitoring
    // Never send PII — nursing queries must stay on-device
    beforeSend(event) {
      if (event.request) delete event.request.data;
      if (event.user)    delete event.user;
      return event;
    },
  });
}

/**
 * Report a non-fatal error with optional context.
 * @param {Error}  error
 * @param {object} [context]
 */
export async function reportError(error, context = {}) {
  if (__DEV__) {
    console.error('[ErrorReporting]', error, context);
    return;
  }
  const Sentry = await getSentry();
  if (!Sentry) return;
  Sentry.withScope(scope => {
    Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(error);
  });
}

/**
 * Add a breadcrumb for clinical audit trail correlation.
 * @param {string} message
 * @param {string} [category]
 */
export async function addBreadcrumb(message, category = 'app') {
  const Sentry = await getSentry();
  if (!Sentry) return;
  Sentry.addBreadcrumb({ message, category, level: 'info' });
}
