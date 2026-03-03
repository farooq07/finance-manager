import React, { useState, useRef, useEffect } from 'react';
import { usePin } from '../context/PinContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ShieldCheck, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function PinGate() {
    const { isPinModalOpen, handlePinSuccess, handlePinCancel } = usePin();
    const [pin, setPin] = useState(['', '', '', '', '', '']); // 6 digits per requirement, though settings said 4. Update: user requested 6.
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRefs = useRef([]);

    // Reset when opened
    useEffect(() => {
        if (isPinModalOpen) {
            setPin(['', '', '', '', '', '']);
            setError('');
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [isPinModalOpen]);

    const handleChange = (index, value) => {
        if (value && !/^\d+$/.test(value)) return;
        const newPin = [...pin];

        // Handle pasting
        if (value.length > 1) {
            const pastedData = value.slice(0, 6).split('');
            for (let i = 0; i < pastedData.length; i++) {
                if (index + i < 6) newPin[index + i] = pastedData[i];
            }
            setPin(newPin);
            const focusIndex = Math.min(index + pastedData.length, 5);
            inputRefs.current[focusIndex]?.focus();

            // Auto submit if 6 digits
            if (newPin.join('').length === 6) verifyPin(newPin.join(''));
            return;
        }

        newPin[index] = value;
        setPin(newPin);
        setError('');

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        } else if (newPin.join('').length === 6) {
            verifyPin(newPin.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const verifyPin = async (fullPin) => {
        if (fullPin.length !== 6) return;
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/verify-pin', { pin: fullPin });
            handlePinSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid PIN code');
            setPin(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isPinModalOpen} onOpenChange={(open) => { if (!open) handlePinCancel(); }}>
            <DialogContent className="sm:max-w-[400px] [&>button]:hidden">
                <DialogPrimitive.Title className="sr-only">Security Check</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">Enter Master PIN to continue.</DialogPrimitive.Description>

                <div className="text-center pt-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                        <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Security Check</h3>
                    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                        Enter your 6-digit Master PIN to unlock balances.
                    </p>

                    <div className="flex gap-2 justify-center mb-6">
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="password"
                                inputMode="numeric"
                                maxLength={6}
                                value={digit}
                                onChange={e => handleChange(index, e.target.value)}
                                onKeyDown={e => handleKeyDown(index, e)}
                                disabled={loading}
                                className="w-10 h-12 text-center text-xl font-bold bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 dark:text-white mb-2"
                            />
                        ))}
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mb-4 animate-pulse">
                            {error}
                        </p>
                    )}

                    {loading && (
                        <div className="flex justify-center mb-4">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
