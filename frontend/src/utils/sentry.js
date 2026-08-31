import * as Sentry from '@sentry/react';

/**
 * Initializes Sentry React SDK for Frontend Error tracking and Telemetry.
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.log('ℹ️ Sentry is disabled on the frontend (missing VITE_SENTRY_DSN).');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE || 'openprep-ai-frontend@1.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance telemetry settings
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.2'),
    replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0.1'),
    replaysOnErrorSampleRate: 1.0, // 100% replays on crash/error
    
    // Capture console error logs as breadcrumbs automatically
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console') {
        if (breadcrumb.level === 'error') {
          // Keep errors but mark them clearly
          breadcrumb.message = `[Console Error] ${breadcrumb.message}`;
        }
      }
      return breadcrumb;
    },
  });

  console.log('✅ Sentry Real-Time Error Tracking and Breadcrumb Telemetry initialized successfully.');
};

export { Sentry };
