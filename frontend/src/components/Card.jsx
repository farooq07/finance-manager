import React from 'react';
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle } from './ui/card';

export function Card({ children, className, href, ...props }) {
    // Flowbite React supports href on Card to make it clickable
    if (href) {
        return (
            <a href={href} className="block group">
                <ShadcnCard className={`transition-shadow hover:shadow-md ${className || ''}`} {...props}>
                    {children}
                </ShadcnCard>
            </a>
        );
    }

    return (
        <ShadcnCard className={className} {...props}>
            {children}
        </ShadcnCard>
    );
}

export default Card;
