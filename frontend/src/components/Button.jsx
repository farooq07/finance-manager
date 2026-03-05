import React from 'react';
import { Button as ShadcnButton } from './ui/button';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function Button({
    children,
    variant,
    size,
    color = 'primary',
    processing = false,
    outline = false,
    disabled,
    className,
    ...props
}) {
    // If explicit variant/size are provided (Shadcn style), use them.
    // Otherwise, map legacy Flowbite props.
    let finalVariant = variant;
    if (!finalVariant) {
        if (color === 'failure' || color === 'red' || color === 'danger') {
            finalVariant = 'destructive';
        } else if (color === 'light' || color === 'alternative' || outline) {
            finalVariant = 'outline';
        } else if (color === 'gray' || color === 'secondary') {
            finalVariant = 'secondary';
        } else if (color === 'ghost') {
            finalVariant = 'ghost';
        } else if (color === 'link') {
            finalVariant = 'link';
        } else {
            finalVariant = 'default';
        }
    }

    let finalSize = size;
    if (!finalSize) {
        // Map legacy 'md' to default, others accordingly
        if (props.size === 'sm') finalSize = 'sm';
        else if (props.size === 'lg') finalSize = 'lg';
        else if (props.size === 'icon') finalSize = 'icon';
        else finalSize = 'default';
    }

    return (
        <ShadcnButton
            variant={finalVariant}
            size={finalSize}
            disabled={disabled || processing}
            className={clsx(className, "relative inline-flex items-center justify-center")}
            {...props}
        >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </ShadcnButton>
    );
}
