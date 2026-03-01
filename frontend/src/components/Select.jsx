import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Custom Select Component designed to match Untitled UI's aesthetic.
 * @param {Array} options - Array of option objects { value, label, subtext, avatar (optional React node) }
 * @param {String} value - Current selected value
 * @param {Function} onChange - Callback with selected option object
 * @param {String} placeholder - Placeholder text when no value is selected
 * @param {String} label - Optional label above the select
 * @param {Boolean} required - Shows an asterisk next to the label if true
 * @param {Boolean} disabled - Disables the select input
 * @param {String} error - Error message to display below the select
 * @param {String} hint - Helpful text to display next to the label (e.g., ? icon)
 */
export default function Select({
    options = [],
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    required,
    disabled = false,
    error,
    hint
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Get the currently selected option object
    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full text-left" ref={containerRef}>
            {/* Label Area */}
            {label && (
                <div className="flex items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                        {label}
                        {required && <span className="text-purple-600 ml-1">*</span>}
                    </label>
                    {hint && (
                        <div className="ml-2 group relative">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[10px] cursor-help">
                                ?
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Select Trigger */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={clsx(
                    "relative w-full bg-white border rounded-lg pl-3 pr-10 py-2.5 text-left cursor-default sm:text-sm transition-all shadow-sm outline-none",
                    disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" : "cursor-pointer",
                    isOpen
                        ? "border-purple-400 ring-4 ring-purple-100/50" // Untitled UI Focus State
                        : error
                            ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100/50"
                            : "border-gray-300 hover:border-gray-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100/50"
                )}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                {/* Selected Content */}
                <span className="flex items-center gap-2 truncate">
                    {selectedOption ? (
                        <>
                            {selectedOption.avatar && (
                                <span className="flex-shrink-0">
                                    {typeof selectedOption.avatar === 'string' ? (
                                        <img src={selectedOption.avatar} alt={selectedOption.label} className="w-5 h-5 rounded-full object-cover" />
                                    ) : (
                                        selectedOption.avatar
                                    )}
                                </span>
                            )}
                            <span className="block truncate text-gray-900 font-medium">
                                {selectedOption.label}
                            </span>
                            {selectedOption.subtext && (
                                <span className="text-gray-500 text-sm font-normal truncate">
                                    {selectedOption.subtext}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="block truncate text-gray-500">{placeholder}</span>
                    )}
                </span>

                {/* Dropdown Icon */}
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={clsx("w-4 h-4 transition-transform duration-200", isOpen ? "text-purple-500 rotate-180" : "text-gray-400")} />
                </span>
            </button>

            {/* Error Message */}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm animate-in fade-in slide-in-from-top-1 duration-100">
                    <ul tabIndex="-1" role="listbox">
                        {options.map((option) => {
                            const isSelected = value === option.value;
                            return (
                                <li
                                    key={option.value}
                                    className={clsx(
                                        "text-gray-900 cursor-pointer select-none relative py-2.5 pl-3 pr-9 transition-colors group",
                                        isSelected ? "bg-purple-50/50" : "hover:bg-gray-50"
                                    )}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => handleSelect(option)}
                                >
                                    <div className="flex items-center gap-2">
                                        {/* Avatar (if any) */}
                                        {option.avatar && (
                                            <span className="flex-shrink-0">
                                                {typeof option.avatar === 'string' ? (
                                                    <img src={option.avatar} alt={option.label} className="w-5 h-5 rounded-full object-cover" />
                                                ) : (
                                                    option.avatar
                                                )}
                                            </span>
                                        )}

                                        {/* Text Content */}
                                        <span className={clsx("block truncate", isSelected ? "font-semibold" : "font-medium")}>
                                            {option.label}
                                        </span>

                                        {/* Subtext */}
                                        {option.subtext && (
                                            <span className={clsx(
                                                "ml-1 truncate text-sm",
                                                isSelected ? "text-purple-600" : "text-gray-500 group-hover:text-gray-600"
                                            )}>
                                                {option.subtext}
                                            </span>
                                        )}
                                    </div>

                                    {/* Checkmark for selected item */}
                                    {isSelected && (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-purple-600">
                                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                        {options.length === 0 && (
                            <li className="text-gray-500 cursor-default select-none relative py-3 pl-3 pr-9">
                                No options available
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
