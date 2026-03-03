import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

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
    // Treat selectedDate as local standard time so days don't shift by timezone
    // Because input is YYYY-MM-DD, parsing it directly `new Date('YYYY-MM-DD')` assumes UTC.
    // Let's ensure it's instantiated as local time or parsed correctly.
    // A simple robust trick is appending T00:00:00.
    const date = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;

    const handleSelect = (newDate) => {
        if (newDate) {
            const year = newDate.getFullYear();
            const month = String(newDate.getMonth() + 1).padStart(2, '0');
            const day = String(newDate.getDate()).padStart(2, '0');
            onChange(`${year}-${month}-${day}`);
        } else {
            onChange('');
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full h-10 px-3 justify-start text-left font-normal bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700",
                        !date && "text-gray-500",
                        disabled && "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-neutral-800",
                        className
                    )}
                    disabled={disabled}
                >
                    {date ? format(date, 'dd/MM/yyyy') : <span>{placeholderText}</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 text-gray-500" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    disabled={(calendarDate) => {
                        if (disabled) return true;
                        if (minDate && calendarDate < new Date(`${minDate}T00:00:00`)) return true;
                        if (maxDate && calendarDate > new Date(`${maxDate}T23:59:59`)) return true;
                        return false;
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
