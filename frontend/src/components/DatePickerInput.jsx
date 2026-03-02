import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

export default function DatePickerInput({
    selectedDate,
    onChange,
    className = '',
    placeholderText = 'Select Date',
    required = false,
    disabled = false,
    minDate = null,
    maxDate = null,
}) {
    // Determine standard styling
    const baseClasses = "w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-colors cursor-pointer outline-none";
    const disabledClasses = disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "";
    const mergedClasses = `${baseClasses} ${disabledClasses} ${className}`.trim();

    return (
        <div className="relative w-full">
            <DatePicker
                selected={selectedDate ? new Date(selectedDate) : null}
                onChange={(date) => {
                    // Normalize the date string to YYYY-MM-DD for backend consistency
                    if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        onChange(`${year}-${month}-${day}`);
                    } else {
                        onChange('');
                    }
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText={placeholderText}
                className={mergedClasses}
                required={required}
                disabled={disabled}
                minDate={minDate}
                maxDate={maxDate}
                showPopperArrow={false}
                portalId="root"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <Calendar className="w-4 h-4" />
            </div>
        </div>
    );
}
