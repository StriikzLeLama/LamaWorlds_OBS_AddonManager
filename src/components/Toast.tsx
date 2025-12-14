import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastProps {
    toast: Toast;
    onClose: (id: string) => void;
}

export const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose(toast.id), 300);
        }, toast.duration || 3000);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onClose]);

    const getToastStyles = () => {
        switch (toast.type) {
            case 'success':
                return 'bg-green-500/20 border-green-500/50 text-green-400';
            case 'error':
                return 'bg-red-500/20 border-red-500/50 text-red-400';
            case 'warning':
                return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
            default:
                return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
        }
    };

    return (
        <div
            className={`glass-panel p-4 mb-3 border ${getToastStyles()} transition-all duration-300 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
            }`}
        >
            <div className="flex items-center justify-between">
                <span>{toast.message}</span>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(() => onClose(toast.id), 300);
                    }}
                    className="ml-4 text-current opacity-70 hover:opacity-100"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

interface ToastContainerProps {
    toasts: Toast[];
    onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 w-96 max-w-full">
            {toasts.map((toast) => (
                <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
};

let toastIdCounter = 0;

class ToastManager {
    private listeners: Set<(toasts: Toast[]) => void> = new Set();
    private toasts: Toast[] = [];

    subscribe(listener: (toasts: Toast[]) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener([...this.toasts]));
    }

    showToast(message: string, type: ToastType = 'info', duration?: number) {
        const id = `toast-${++toastIdCounter}`;
        const toast: Toast = { id, message, type, duration };
        this.toasts.push(toast);
        this.notify();
    }

    removeToast(id: string) {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.notify();
    }

    success(message: string, duration?: number) {
        this.showToast(message, 'success', duration);
    }

    error(message: string, duration?: number) {
        this.showToast(message, 'error', duration);
    }

    info(message: string, duration?: number) {
        this.showToast(message, 'info', duration);
    }

    warning(message: string, duration?: number) {
        this.showToast(message, 'warning', duration);
    }
}

const toastManager = new ToastManager();

export const useToast = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const unsubscribe = toastManager.subscribe(setToasts);
        return () => {
            unsubscribe();
        };
    }, []);

    return {
        toasts,
        success: (message: string, duration?: number) => toastManager.success(message, duration),
        error: (message: string, duration?: number) => toastManager.error(message, duration),
        info: (message: string, duration?: number) => toastManager.info(message, duration),
        warning: (message: string, duration?: number) => toastManager.warning(message, duration),
        removeToast: (id: string) => toastManager.removeToast(id),
    };
};

