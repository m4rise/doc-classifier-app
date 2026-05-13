import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // RGPD: never send PII (IP, email, user agent) automatically
  sendDefaultPii: false,
  environment: process.env.NODE_ENV ?? 'development',
  // RGPD: strip sensitive data before sending to Sentry
  beforeSend(event) {
    // Remove any user PII from events
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    return event;
  },
});
