import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Save the signed-in user's onboarding / menu preferences.
 * body: { interests?: string[] | null, completeOnboarding?: true }
 * Refreshes the auth user afterwards so the sidebar and tabs update at once.
 */
export function useUpdatePreferences() {
    const { refreshUser } = useAuth();
    return useMutation({
        mutationFn: async (body) => (await api.patch('/users/me/preferences', body)).data,
        onSuccess: () => refreshUser(),
    });
}
