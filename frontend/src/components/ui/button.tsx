import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-gray-900",
    {
        variants: {
            variant: {
                primary:
                    "bg-primary-600 text-white hover:bg-primary-700 shadow-sm focus-visible:ring-primary-400 dark:bg-primary-600 dark:hover:bg-primary-500",
                secondary:
                    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400 shadow-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700",
                tertiary:
                    "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
                ghost:
                    "text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50",
                link: "text-primary-600 underline-offset-4 hover:underline dark:text-primary-400",
                error:
                    "bg-error-600 text-white hover:bg-error-700 shadow-sm focus-visible:ring-error-400 dark:bg-error-700 dark:hover:bg-error-600",
            },
            size: {
                sm: "h-9 px-3 text-xs rounded-sm",
                md: "h-10 px-4 py-2 rounded-md",
                lg: "h-11 px-8 text-base rounded-lg",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant,
            size,
            asChild = false,
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        const Comp = asChild ? Slot : "button"

        // Add gap dynamically if there are icons or loading indicators alongside text
        const hasContent = children !== undefined && children !== null
        const needsGap = hasContent && (leftIcon || rightIcon || isLoading)

        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }), needsGap ? "gap-2" : "")}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
                {children && <span className="truncate">{children}</span>}
                {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
