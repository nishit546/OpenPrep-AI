import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { ThemeProvider } from './context/ThemeContext'
import { SyncProvider } from './context/SyncContext'
import { PomodoroProvider } from './context/PomodoroContext'
import { SessionTimerProvider } from './context/SessionTimerContext'
import SentryErrorBoundary from './components/common/SentryErrorBoundary'
import './index.css'
import './styles/rtl.css';
import './i18n';

import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { initSentry } from './utils/sentry'
import { initFrontendTelemetry } from './config/telemetry'

// Initialize monitoring & telemetry
initSentry();
initFrontendTelemetry();

// Catch Vite chunk load errors when a new deployment updates JS assets
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason &&
    (event.reason.message?.includes('Failed to fetch dynamically imported module') ||
      event.reason.message?.includes('Importing a module script failed'))
  ) {
    const lastReload = sessionStorage.getItem('chunk_reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('chunk_reload', now.toString());
      window.location.reload();
    }
  }
});

// Register Service Worker for offline asset & API response caching
if ('serviceWorker' in navigator && import.meta.env.MODE !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('✅ Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ Service Worker registration failed:', err);
      });
  });
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '179369126060-lq7unpt173rt6aog2nt93s6m895d6b2i.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SentryErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Provider store={store}>
          <ThemeProvider>
            <SyncProvider>
              <PomodoroProvider>
                <BrowserRouter>
                  <SessionTimerProvider>
                    <App />
                  </SessionTimerProvider>
                </BrowserRouter>
              </PomodoroProvider>
            </SyncProvider>
          </ThemeProvider>
        </Provider>
      </GoogleOAuthProvider>
    </SentryErrorBoundary>
  </StrictMode>,
)
