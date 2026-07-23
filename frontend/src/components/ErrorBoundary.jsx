import { Component } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950 p-4">
          <div className="w-full max-w-md bg-gradient-to-br from-amber-50 to-amber-100 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-amber-700/50 p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-red-100 border border-red-300 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold font-playfair text-stone-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-stone-600 text-sm mb-6">
              An unexpected error occurred. Please try again or return to the home page.
            </p>

            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-sm p-3 mb-6 text-left">
                <p className="text-xs text-red-700 font-mono break-all">
                  {this.state.error.message || 'Unknown error'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-amber-50 font-semibold rounded-sm transition-colors text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-stone-300 hover:bg-slate-50 text-stone-700 font-semibold rounded-sm transition-colors text-sm"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
