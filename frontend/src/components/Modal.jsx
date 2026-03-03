import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import * as DialogPrimitive from "@radix-ui/react-dialog";

const sizeMap = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-5xl',
};

const typeMap = {
    success: { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-600' },
    danger: { icon: AlertTriangle, bg: 'bg-red-100', text: 'text-red-600' },
    warning: { icon: AlertCircle, bg: 'bg-amber-100', text: 'text-amber-600' },
    info: { icon: Info, bg: 'bg-blue-100', text: 'text-blue-600' },
    default: { icon: null, bg: 'bg-gray-100', text: 'text-gray-600' }
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
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && onClose) onClose(); }}>
            <DialogContent className={`${sizeMap[size] || 'sm:max-w-md'} ${hideCloseButton ? '[&>button]:hidden' : ''} max-h-[90vh] overflow-y-auto`}>
                {/* For accessibility, Radix requires a title. If not provided visually, we render a hidden one */}
                {!title && (
                    <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
                )}
                {!description && (
                    <DialogPrimitive.Description className="sr-only">Dialog Description</DialogPrimitive.Description>
                )}

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
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-gray-900 mb-2 dark:text-white">
                                    {title}
                                </DialogTitle>
                                {description && (
                                    <DialogDescription className="text-base text-gray-500 leading-relaxed dark:text-gray-400">
                                        {description}
                                    </DialogDescription>
                                )}
                            </DialogHeader>
                        )}
                        {!title && description && (
                            <DialogDescription className="text-base text-gray-500 leading-relaxed mb-4 dark:text-gray-400">
                                {description}
                            </DialogDescription>
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
                                    <Button variant="outline" onClick={secondaryAction.onClick} disabled={secondaryAction.disabled}>
                                        {secondaryAction.label}
                                    </Button>
                                )}
                                {primaryAction && (
                                    <Button
                                        variant={primaryAction.variant === 'danger' ? 'destructive' : 'default'}
                                        onClick={primaryAction.onClick}
                                        disabled={primaryAction.disabled || primaryAction.isLoading}
                                    >
                                        {primaryAction.isLoading ? 'Processing...' : primaryAction.label}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Standard Footer if not hiding close button (popup mode) */}
                {!hideCloseButton && (primaryAction || secondaryAction) && (
                    <DialogFooter className="mt-2 flex justify-end gap-3">
                        {secondaryAction && (
                            <Button variant="outline" onClick={secondaryAction.onClick} disabled={secondaryAction.disabled} className="w-full sm:w-auto">
                                {secondaryAction.label}
                            </Button>
                        )}
                        {primaryAction && (
                            <Button
                                variant={primaryAction.variant === 'danger' ? 'destructive' : 'default'}
                                onClick={primaryAction.onClick}
                                disabled={primaryAction.disabled || primaryAction.isLoading}
                                className="w-full sm:w-auto"
                            >
                                {primaryAction.isLoading ? 'Processing...' : primaryAction.label}
                            </Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
