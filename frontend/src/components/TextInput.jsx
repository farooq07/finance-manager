import React, { forwardRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { clsx } from 'clsx';

const TextInput = forwardRef(({
    sizing = 'md',
    icon: Icon,
    rightIcon: RightIcon,
    helperText,
    color,
    className,
    ...props
}, ref) => {
    // Handle sizing adjustments if needed
    let sizeClasses = "h-10"; // md default
    if (sizing === 'sm') sizeClasses = "h-8 px-2 text-xs";
    if (sizing === 'lg') sizeClasses = "h-12 px-4 text-lg";

    // Handle error state
    const isError = color === 'failure';

    return (
        <div className="w-full">
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Icon className={clsx("w-5 h-5", isError ? "text-red-500" : "text-gray-500")} />
                    </div>
                )}

                <Input
                    ref={ref}
                    className={clsx(
                        sizeClasses,
                        Icon && "pl-10",
                        RightIcon && "pr-10",
                        isError && "border-red-500 focus-visible:ring-red-500",
                        className
                    )}
                    {...props}
                />

                {RightIcon && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <RightIcon className={clsx("w-5 h-5", isError ? "text-red-500" : "text-gray-500")} />
                    </div>
                )}
            </div>
            {helperText && (
                <p className={clsx("mt-1.5 text-sm", isError ? "text-red-600 dark:text-red-500" : "text-gray-500 dark:text-gray-400")}>
                    {helperText}
                </p>
            )}
        </div>
    );
});

TextInput.displayName = 'TextInput';

export default TextInput;
