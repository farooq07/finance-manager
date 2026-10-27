import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient for tests: no retries, and gcTime Infinity so no 5-minute
 * garbage-collection timers are left running — those keep Jest's process
 * alive for minutes after the tests finish.
 */
export const testQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } },
});
