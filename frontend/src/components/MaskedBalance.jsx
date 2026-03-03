import React from 'react';
import { usePin } from '../context/PinContext';
import { Eye, EyeOff } from 'lucide-react';
import { fmtPKR } from '../utils/currency';

export default function MaskedBalance({
    value,
    className = "",
    iconClassName = "",
    isCurrency = true,
    fallbackText = "••••••"
}) {
    const { isUnlocked, promptPin } = usePin();

    const displayValue = isCurrency ? fmtPKR(value) : value;

    const handleToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isUnlocked) {
            await promptPin();
        }
    };

    return (
        <div className="flex items-center gap-2 group relative">
            <span className={className}>
                {isUnlocked ? displayValue : fallbackText}
            </span>
            <button
                onClick={handleToggle}
                className={`text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 ${iconClassName} ${!isUnlocked && 'opacity-60'}`}
                title={isUnlocked ? "Unlocked (Auto-locks on reload)" : "Click to unlock with PIN"}
            >
                {isUnlocked ? (
                    <EyeOff className="w-4 h-4" />
                ) : (
                    <Eye className="w-4 h-4" />
                )}
            </button>
        </div>
    );
}
