import { useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useSession } from './sessionStore';

/** Drop every cached query when the session ends, so the next user sees none of it. */
export function useClearCacheOnSignOut(client: QueryClient) {
    useEffect(() => useSession.subscribe((state, prev) => {
        if (state.status === 'signedOut' && prev.status !== 'signedOut') client.clear();
    }), [client]);
}
