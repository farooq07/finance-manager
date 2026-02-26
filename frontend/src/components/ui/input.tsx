import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle } from "lucide-react"

import { cn } from "../../lib/utils"

const inputVariants = cva(
    "flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 transition-colors",
    {
        variants: {
            variant: {
                default: "border-gray-300 focus-visible:ring-primary-400",
                error: "border-error-300 text-error-900 focus-visible:ring-error-400 placeholder:text-error-300",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
    label?: string;
    hintText?: string;
    errorText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, variant, label, hintText, errorText, id, ...props }, ref) => {
        const inputId = id || React.useId()
        const errorId = `${inputId}-error`
        const hintId = `${inputId}-hint`

        const isError = variant === 'error' || !!errorText;
        const activeVariant = isError ? 'error' : 'default';

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {label}
                        {props.required && <span className="text-error-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative">
                    <input
                        id={inputId}
                        className={cn(inputVariants({ variant: activeVariant, className }))}
                        ref={ref}
                        aria-invalid={isError}
                        aria-describedby={
                            cn(
                                errorText ? errorId : undefined,
                                hintText ? hintId : undefined
                            ) || undefined
                        }
                        {...props}
                    />
                    {isError && (
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <AlertCircle className="h-5 w-5 text-error-500" aria-hidden="true" />
                        </div>
                    )}
                </div>

                {hintText && !isError && (
                    <p id={hintId} className="text-sm text-gray-500 dark:text-gray-400">
                        {hintText}
                    </p>
                )}

                {isError && errorText && (
                    <p id={errorId} className="text-sm font-medium text-error-600 dark:text-error-500">
                        {errorText}
                    </p>
                )}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input, inputVariants }
