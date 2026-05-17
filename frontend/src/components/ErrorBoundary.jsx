import React from 'react';

/**
 * Root-level error boundary. Catches render errors in the React tree and
 * shows a recovery screen instead of a blank white page. Logs the error so
 * we can find it later in browser/Sentry logs.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary]', error, info?.componentStack);
        this.setState({ info });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleHome = () => {
        window.location.href = '/';
    };

    render() {
        if (!this.state.error) return this.props.children;

        const isDev = import.meta.env.MODE !== 'production';

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950 p-6">
                <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm p-8">
                    <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-5">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zm0 13.036h.008v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Something went wrong
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        The app hit an unexpected error. Try reloading — if it keeps happening, head back to the dashboard.
                    </p>

                    {isDev && this.state.error && (
                        <pre className="mt-5 p-3 rounded-lg bg-gray-50 dark:bg-neutral-800 text-xs text-red-700 dark:text-red-300 overflow-auto max-h-48 font-mono">
                            {String(this.state.error?.message || this.state.error)}
                        </pre>
                    )}

                    <div className="mt-6 flex gap-2">
                        <button
                            onClick={this.handleReload}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                        >
                            Reload page
                        </button>
                        <button
                            onClick={this.handleHome}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                            Back to dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
