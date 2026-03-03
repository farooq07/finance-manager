import React from 'react';
import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { clsx } from 'clsx';
import { HelpCircle } from 'lucide-react';

export default function Select({
    options = [],
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    required,
    disabled = false,
    error,
    hint,
    className
}) {
    return (
        <div className={clsx("relative w-full text-left flex flex-col gap-1.5", className)}>
            {/* Label Area */}
            {label && (
                <div className="flex items-center">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {label}
                        {required && <span className="text-brand ml-1">*</span>}
                    </label>
                    {hint && (
                        <div className="ml-2 group relative">
                            <HelpCircle className="w-4 h-4 text-gray-400" />
                        </div>
                    )}
                </div>
            )}

            <ShadcnSelect value={value} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger className={clsx(
                    "w-full bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700",
                    error && "border-red-500 focus:ring-red-500"
                )}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">No options available</div>
                    ) : (
                        options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                    {option.avatar && (
                                        typeof option.avatar === 'string' ? (
                                            <img src={option.avatar} alt={option.label} className="w-5 h-5 rounded-full object-cover" />
                                        ) : (
                                            option.avatar
                                        )
                                    )}
                                    <span className="font-medium">{option.label}</span>
                                    {option.subtext && (
                                        <span className="text-gray-500 text-sm ml-1">{option.subtext}</span>
                                    )}
                                </div>
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </ShadcnSelect>
            {/* Error Message */}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
