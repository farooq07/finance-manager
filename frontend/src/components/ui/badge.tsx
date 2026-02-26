import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
    {
        variants: {
            variant: {
                primary:
                    "border-transparent bg-primary-100 text-primary-800 hover:bg-primary-200 dark:bg-primary-900/40 dark:text-primary-300",
                secondary:
                    "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300",
                destructive:
                    "border-transparent bg-error-100 text-error-800 hover:bg-error-200 dark:bg-error-900/40 dark:text-error-300",
                warning:
                    "border-transparent bg-warning-100 text-warning-800 hover:bg-warning-200 dark:bg-warning-900/40 dark:text-warning-300",
                success:
                    "border-transparent bg-success-100 text-success-800 hover:bg-success-200 dark:bg-success-900/40 dark:text-success-300",
                outline: "text-gray-950 dark:text-gray-50 border-gray-200 dark:border-gray-800",
            },
        },
        defaultVariants: {
            variant: "secondary",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
