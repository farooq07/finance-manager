import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Handles the "this bank/wallet/transaction was deleted out from under me" case.
 *
 * A 404 from a per-row action (approve / update / delete) means the underlying
 * record no longer exists server-side — typically because the bank or wallet
 * was removed in another tab, or the DB was reset, while this page stayed open.
 * Leaving the stale rows on screen lets the user keep clicking dead data, so we
 * invalidate the bank/wallet caches; the parent page's own not-found handling
 * (BankDetail redirects to /accounts, WalletDetail shows "Wallet not found")
 * then takes over. This is context-agnostic on purpose — BankTransactionsTable
 * is rendered by both the bank and wallet detail pages.
 *
 * Returns a handler that reports whether it consumed the error, so callers can
 * skip their generic error toast when it did.
 */
export function useStaleResourceHandler() {
    const queryClient = useQueryClient();

    return useCallback((error) => {
        if (error?.response?.status !== 404) return false;
        const message = error.response?.data?.message || '';

        const refreshAccounts = () => {
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
        };

        if (/(bank|wallet) not found/i.test(message)) {
            refreshAccounts();
            toast.error('This account no longer exists.');
            return true;
        }
        if (/transaction not found/i.test(message)) {
            refreshAccounts();
            toast.error('That transaction no longer exists — list refreshed.');
            return true;
        }
        return false;
    }, [queryClient]);
}
