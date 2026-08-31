import React, { Component } from 'react';
import * as Sentry from '@sentry/react';
import { AlertOctagon, RefreshCw, MessageSquare, Home } from 'lucide-react';

export default class SentryErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SentryErrorBoundary] Caught error:', error, errorInfo);

    // Capture crash report exception in Sentry and get event ID
    if (import.meta.env.MODE !== 'test') {
      Sentry.withScope((scope) => {
        scope.setExtras(errorInfo);
        const eventId = Sentry.captureException(error);
        this.setState({ eventId });
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleFeedback = () => {
    if (this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    } else {
      alert('Feedback dialog is loading or Sentry is offline. Please reload the page.');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-inter">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            
            {/* Visual Icon Header */}
            <div className="flex justify-center">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-pulse">
                <AlertOctagon className="w-10 h-10 text-red-500" />
              </div>
            </div>

            {/* Error Message Header */}
            <div className="space-y-2">
              <h1 className="text-2xl font-black font-playfair tracking-tight text-white">
                Oops! Something went wrong
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected application crash occurred. The issue has been reported automatically to our engineering team.
              </p>
            </div>

            {/* Display Error Detail if available */}
            {this.state.error && (
              <div className="bg-stone-950/60 border border-neutral-850 p-4 rounded-2xl text-left max-h-32 overflow-y-auto">
                <p className="text-[10px] font-mono text-red-400 break-all leading-normal">
                  {this.state.error.stack || this.state.error.message}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/10 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>

              {this.state.eventId && (
                <button
                  onClick={this.handleFeedback}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  Submit Feedback Report
                </button>
              )}

              <a
                href="/"
                className="w-full py-3 bg-transparent text-slate-400 hover:text-white font-bold text-xs transition flex items-center justify-center gap-1.5 hover:underline"
              >
                <Home className="w-3.5 h-3.5" />
                Go to Dashboard Home
              </a>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
