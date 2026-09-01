import React from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/60 p-8 space-y-6 text-center animate-fade-in">
            {/* Warning Icon Banner */}
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-500 flex items-center justify-center mb-4 shadow-inner">
                <AlertOctagon className="h-9 w-9 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                An unexpected exception occurred while rendering this interface layout viewport. The error logs have been captured.
              </p>
            </div>

            {/* Error Message Stack Trace Accordion */}
            {this.state.error && (
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Diagnostics:
                </div>
                <div className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-50/40 dark:bg-red-950/10 p-3 rounded-lg border border-red-100 dark:border-red-950/40 select-text overflow-x-auto whitespace-pre-wrap max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 text-xs font-bold pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-1/2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Application</span>
              </button>
              <button
                onClick={() => { window.location.reload(); }}
                className="w-full sm:w-1/2 py-3 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Refresh Tab View</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
