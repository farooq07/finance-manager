import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';

interface PinState {
  isPinVerified: boolean;
  setPinVerified: (val: boolean) => void;
}

export const usePinStore = create<PinState>((set) => ({
  isPinVerified: false,
  setPinVerified: (val) => set({ isPinVerified: val }),
}));

AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'background' || state === 'inactive') {
    usePinStore.getState().setPinVerified(false);
  }
});
