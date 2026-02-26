import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    description?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, description, id, ...props }, ref) => {
        const inputId = id || React.useId()

        return (
            <div className="relative flex items-start">
                <div className="flex h-6 items-center">
                    <input
                        id={inputId}
                        type="checkbox"
                        className={cn(
                            "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary-600 checked:border-primary-600 dark:border-gray-700 dark:ring-offset-gray-950 dark:checked:bg-primary-500 appearance-none transition-all",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    {/* Custom Check Icon rendered when peered input is checked */}
                    <Check className="pointer-events-none absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                </div>

                {(label || description) && (
                    <div className="ml-3 text-sm leading-6">
                        {label && (
                            <label htmlFor={inputId} className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {label}
                            </label>
                        )}
                        {description && (
                            <p className="text-gray-500 dark:text-gray-400">{description}</p>
                        )}
                    </div>
                )}
            </div>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
