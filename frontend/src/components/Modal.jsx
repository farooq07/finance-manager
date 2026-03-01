import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
};

const typeMap = {
    success: {
        icon: CheckCircle,
        bg: 'bg-green-100',
        text: 'text-green-600',
        ring: 'ring-green-50',
    },
    danger: {
        icon: AlertTriangle,
        bg: 'bg-red-100',
        text: 'text-red-600',
        ring: 'ring-red-50',
    },
    warning: {
        icon: AlertCircle,
        bg: 'bg-amber-100',
        text: 'text-amber-600',
        ring: 'ring-amber-50',
    },
    info: {
        icon: Info,
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        ring: 'ring-blue-50',
    },
    default: {
        icon: null,
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        ring: 'ring-gray-50',
    }
};

export default function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md', // sm, md, lg, xl
    type = 'default', // success, danger, warning, info, default
    icon: CustomIcon,
    primaryAction, // { label, onClick, isLoading, disabled, variant?: 'danger' | 'primary' }
    secondaryAction, // { label, onClick, disabled }
    hideCloseButton = false,
}) {
    const [isRendered, setIsRendered] = useState(isOpen);
    const [isVisible, setIsVisible] = useState(false);

    // Handle smooth mounting/unmounting animation
    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            // Small delay to allow element to render before adding opacity classes
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setIsRendered(false), 200); // match duration-200
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isRendered) return null;

    const config = typeMap[type] || typeMap.default;
    const Icon = CustomIcon || config.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-200 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Panel */}
            <div
                className={`flex flex-col relative bg-white rounded-2xl shadow-2xl w-full ${sizeMap[size] || sizeMap.md} transition-all duration-200 ease-out transform ${isVisible ? 'opacity-100 scale-100 tranneutral-y-0' : 'opacity-0 scale-95 tranneutral-y-4'} max-h-[90vh]`}
                role="dialog"
                aria-modal="true"
            >
                {/* Optional Close Button (Top Right) */}
                {!hideCloseButton && (
                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Header & Body Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">

                        {/* Status Icon */}
                        {Icon && (
                            <div className="shrink-0 flex items-start">
                                <div className={`p-3 rounded-full ${config.bg} ${config.text} ring-8 ${config.ring}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                            </div>
                        )}

                        {/* Title & Description */}
                        <div className={`flex-1 ${!Icon ? 'pt-1' : 'pt-2'} text-center sm:text-left`}>
                            {title && (
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                                    {description}
                                </p>
                            )}

                            {/* Injected Children (Forms, Data, etc.) */}
                            {children && (
                                <div className="mt-5 text-left text-gray-900">
                                    {children}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                {(primaryAction || secondaryAction) && (
                    <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 rounded-b-2xl flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        {secondaryAction && (
                            <button
                                type="button"
                                onClick={secondaryAction.onClick}
                                disabled={secondaryAction.disabled}
                                className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
                            >
                                {secondaryAction.label}
                            </button>
                        )}
                        {primaryAction && (
                            <button
                                type="button"
                                onClick={primaryAction.onClick}
                                disabled={primaryAction.disabled || primaryAction.isLoading}
                                className={`w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 ${primaryAction.variant === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                    }`}
                            >
                                {primaryAction.isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    primaryAction.label
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
