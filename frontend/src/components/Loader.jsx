import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loader({ message = "Loading...", fullScreen = true }) {
    const containerClasses = fullScreen
        ? "min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4"
        : "flex flex-col items-center justify-center p-8 space-y-4 w-full h-full";

    return (
        <div className={containerClasses}>
            <div className="relative">
                <div className="absolute inset-0 rounded-full blur-md opacity-20 bg-emerald-500 animate-pulse"></div>
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin relative z-10" />
            </div>
            {message && (
                <p className="text-sm font-medium text-gray-500 animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );
}
