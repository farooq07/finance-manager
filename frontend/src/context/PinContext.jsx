import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const PinContext = createContext();

export const PinProvider = ({ children }) => {
    const { user } = useAuth();
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [hasPin, setHasPin] = useState(false);

    // For the global PinGate modal
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [resolvePinPromise, setResolvePinPromise] = useState(null);

    // Update hasPin status when user loads
    useEffect(() => {
        if (user && user.hasPin !== undefined) {
            setHasPin(user.hasPin);
        }
    }, [user]);

    // A new identity (or signing out) always starts locked.
    useEffect(() => {
        setIsUnlocked(false);
        setIsPinModalOpen(false);
        if (!user) setHasPin(false);
    }, [user?.id]);

    // Update hasPin explicitly (e.g. from Settings after creating a PIN)
    const updateHasPin = (status) => {
        setHasPin(status);
        if (!status) setIsUnlocked(false);
    };

    const lock = () => {
        setIsUnlocked(false);
    };

    const unlock = () => {
        setIsUnlocked(true);
    };

    // Prompt user for PIN. Returns a promise that resolves to true (success) or false (cancelled/failed)
    const promptPin = () => {
        if (!hasPin) {
            // If they don't have a PIN, theoretically everything is unlocked, or they should be prompted to create one.
            // But per business logic, balances are masked until a PIN is created.
            toast.error("You need to setup a Master PIN in Console Settings first.");
            return Promise.resolve(false);
        }

        if (isUnlocked) return Promise.resolve(true);

        return new Promise((resolve) => {
            setIsPinModalOpen(true);
            setResolvePinPromise(() => resolve);
        });
    };

    const handlePinSuccess = () => {
        setIsUnlocked(true);
        setIsPinModalOpen(false);
        if (resolvePinPromise) {
            resolvePinPromise(true);
            setResolvePinPromise(null);
        }
    };

    const handlePinCancel = () => {
        setIsPinModalOpen(false);
        if (resolvePinPromise) {
            resolvePinPromise(false);
            setResolvePinPromise(null);
        }
    };

    return (
        <PinContext.Provider value={{
            isUnlocked,
            hasPin,
            updateHasPin,
            lock,
            unlock,
            promptPin,
            isPinModalOpen,
            handlePinSuccess,
            handlePinCancel
        }}>
            {children}
        </PinContext.Provider>
    );
};

export const usePin = () => useContext(PinContext);
