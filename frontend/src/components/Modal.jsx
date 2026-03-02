import React from 'react';
import { Modal as FlowbiteModal, Button } from 'flowbite-react';
import { CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const sizeMap = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
};

const typeMap = {
    success: {
        icon: CheckCircle,
        bg: 'bg-green-100',
        text: 'text-green-600',
    },
    danger: {
        icon: AlertTriangle,
        bg: 'bg-red-100',
        text: 'text-red-600',
    },
    warning: {
        icon: AlertCircle,
        bg: 'bg-amber-100',
        text: 'text-amber-600',
    },
    info: {
        icon: Info,
        bg: 'bg-blue-100',
        text: 'text-blue-600',
    },
    default: {
        icon: null,
        bg: 'bg-gray-100',
        text: 'text-gray-600',
    }
};

export default function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    type = 'default',
    icon: CustomIcon,
    primaryAction,
    secondaryAction,
    hideCloseButton = false,
}) {
    const config = typeMap[type] || typeMap.default;
    const Icon = CustomIcon || config.icon;

    return (
        <FlowbiteModal
            show={isOpen}
            size={sizeMap[size] || 'md'}
            onClose={onClose}
            popup={hideCloseButton}
        >
            {!hideCloseButton && (
                <FlowbiteModal.Header />
            )}
            <FlowbiteModal.Body>
                <div className="flex flex-col sm:flex-row gap-4">
                    {Icon && (
                        <div className="shrink-0 flex items-start">
                            <div className={`p-3 rounded-full ${config.bg} ${config.text}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                        </div>
                    )}

                    <div className={`flex-1 ${!Icon ? 'pt-1' : 'pt-2'} text-center sm:text-left`}>
                        {title && (
                            <h3 className="text-xl font-bold text-gray-900 mb-2 dark:text-white">
                                {title}
                            </h3>
                        )}
                        {description && (
                            <p className="text-base text-gray-500 leading-relaxed mb-4 dark:text-gray-400">
                                {description}
                            </p>
                        )}

                        {children && (
                            <div className="mt-5 text-left text-gray-900 dark:text-white">
                                {children}
                            </div>
                        )}

                        {/* If using popup style with no header, place actions inline inside the body */}
                        {hideCloseButton && (primaryAction || secondaryAction) && (
                            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                                {secondaryAction && (
                                    <Button color="light" onClick={secondaryAction.onClick} disabled={secondaryAction.disabled}>
                                        {secondaryAction.label}
                                    </Button>
                                )}
                                {primaryAction && (
                                    <Button
                                        color={primaryAction.variant === 'danger' ? 'failure' : 'blue'}
                                        onClick={primaryAction.onClick}
                                        disabled={primaryAction.disabled || primaryAction.isLoading}
                                        isProcessing={primaryAction.isLoading}
                                    >
                                        {primaryAction.label}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </FlowbiteModal.Body>

            {/* Standard Footer if not hiding close button (popup mode) */}
            {!hideCloseButton && (primaryAction || secondaryAction) && (
                <FlowbiteModal.Footer className="flex justify-end gap-3">
                    {secondaryAction && (
                        <Button color="light" onClick={secondaryAction.onClick} disabled={secondaryAction.disabled}>
                            {secondaryAction.label}
                        </Button>
                    )}
                    {primaryAction && (
                        <Button
                            color={primaryAction.variant === 'danger' ? 'failure' : 'blue'}
                            onClick={primaryAction.onClick}
                            disabled={primaryAction.disabled || primaryAction.isLoading}
                            isProcessing={primaryAction.isLoading}
                        >
                            {primaryAction.label}
                        </Button>
                    )}
                </FlowbiteModal.Footer>
            )}
        </FlowbiteModal>
    );
}
