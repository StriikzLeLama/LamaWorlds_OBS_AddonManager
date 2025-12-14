import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('ErrorBoundary caught an error', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="glass-panel p-6 m-4">
                    <h2 className="text-xl font-bold text-red-400 mb-4">Something went wrong</h2>
                    <p className="text-gray-300 mb-4">
                        An error occurred while rendering this component.
                    </p>
                    {this.state.error && (
                        <details className="mb-4">
                            <summary className="cursor-pointer text-gray-400 mb-2">
                                Error Details
                            </summary>
                            <pre className="bg-black/30 p-3 rounded text-xs text-red-300 overflow-auto">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                    <button
                        onClick={this.handleReset}
                        className="btn btn-primary"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

