import React from 'react';
import { Button as ShadcnButton } from './ui/button';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function Button({
    children,
    color = 'primary',
    size = 'md',
    processing = false,
    outline = false,
    disabled,
    className,
    ...props
}) {
    // Map Flowbite colors to Shadcn variants
    let variant = 'default';
    if (color === 'failure' || color === 'red' || color === 'danger') {
        variant = 'destructive';
    } else if (color === 'light' || color === 'alternative' || outline) {
        variant = 'outline';
    } else if (color === 'gray' || color === 'secondary') {
        variant = 'secondary';
    } else if (color === 'ghost') {
        variant = 'ghost';
    }

    // Map Flowbite sizes to Shadcn sizes
    let buttonSize = 'default';
    if (size === 'sm') buttonSize = 'sm';
    if (size === 'lg') buttonSize = 'lg';
    if (size === 'icon') buttonSize = 'icon';

    return (
        <ShadcnButton
            variant={variant}
            size={buttonSize}
            disabled={disabled || processing}
            className={clsx(className, "relative inline-flex items-center justify-center")}
            {...props}
        >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </ShadcnButton>
    );
}
