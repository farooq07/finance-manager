import { useState } from 'react';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../stores/authStore';

interface UsePinVerificationReturn {
  showPinModal: boolean;
  setShowPinModal: (value: boolean) => void;
  pinInput: string;
  setPinInput: (value: string) => void;
  verifying: boolean;
  handleVerify: () => Promise<boolean>;
  resetPin: () => void;
}

/**
 * Hook for PIN verification with retries and lockout
 * Used for sensitive operations like viewing hidden amounts
 */
export function usePinVerification(): UsePinVerificationReturn {
  const { pin: storedPin } = useAuthStore();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  const handleVerify = async (): Promise<boolean> => {
    if (!pinInput.trim()) {
      Toast.show({ type: 'error', text1: 'PIN is required' });
      return false;
    }

    if (attempts >= MAX_ATTEMPTS) {
      Toast.show({
        type: 'error',
        text1: 'Too many attempts',
        text2: 'Please try again later',
      });
      return false;
    }

    setVerifying(true);
    try {
      // Simulate async verification
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (pinInput === storedPin) {
        Toast.show({ type: 'success', text1: 'PIN verified' });
        resetPin();
        setShowPinModal(false);
        return true;
      } else {
        const remainingAttempts = MAX_ATTEMPTS - (attempts + 1);
        setAttempts(attempts + 1);
        Toast.show({
          type: 'error',
          text1: 'Incorrect PIN',
          text2: remainingAttempts > 0
            ? `${remainingAttempts} attempts remaining`
            : 'Too many attempts',
        });
        return false;
      }
    } finally {
      setVerifying(false);
    }
  };

  const resetPin = () => {
    setPinInput('');
    setAttempts(0);
  };

  return {
    showPinModal,
    setShowPinModal,
    pinInput,
    setPinInput,
    verifying,
    handleVerify,
    resetPin,
  };
}
