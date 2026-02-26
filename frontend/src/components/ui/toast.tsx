import * as React from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"
import { cn } from "../../lib/utils"

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
    id: string
    title: string
    description?: string
    type: ToastType
}

interface ToastContextType {
    addToast: (toast: Omit<ToastMessage, 'id'>) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastMessage[]>([])

    const addToast = React.useCallback((toast: Omit<ToastMessage, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts((prev) => [...prev, { ...toast, id }])

        // Auto remove after 5s
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 5000)
    }, [])

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {typeof document !== "undefined" && createPortal(
                <div className="fixed bottom-0 right-0 z-[100] p-4 sm:p-6 pb-8 space-y-4 w-full sm:w-auto flex flex-col items-center sm:items-end pointer-events-none">
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

export const useToast = () => {
    const context = React.useContext(ToastContext)
    if (!context) throw new Error("useToast must be used within ToastProvider")
    return context
}

// Internal Toast Component
function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
    const icons = {
        success: <CheckCircle2 className="h-5 w-5 text-success-500" />,
        error: <XCircle className="h-5 w-5 text-error-500" />,
        info: <Info className="h-5 w-5 text-primary-500" />
    }

    const bgClasses = {
        success: "bg-white dark:bg-gray-900 border-success-200 dark:border-success-900",
        error: "bg-white dark:bg-gray-900 border-error-200 dark:border-error-900",
        info: "bg-white dark:bg-gray-900 border-primary-200 dark:border-primary-900"
    }

    return (
        <div className={cn(
            "pointer-events-auto flex w-full sm:w-80 max-w-sm rounded-lg border shadow-lg p-4 animate-in slide-in-from-bottom-5 fade-in duration-300",
            bgClasses[toast.type]
        )}>
            <div className="flex items-start gap-3 w-full">
                <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
                <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{toast.title}</p>
                    {toast.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{toast.description}</p>
                    )}
                </div>
                <button
                    onClick={onRemove}
                    className="shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
