import { useQuery } from '@tanstack/react-query';
import { accountsKey, loadAccounts } from '../accounts/AccountsScreen';

/** How you paid: your banks and wallets by name, then Cash — same list as the web app. */
export function usePaymentMethods(enabled = true) {
    const accounts = useQuery({ queryKey: accountsKey, queryFn: loadAccounts, enabled });
    return [...new Set([...(accounts.data ?? []).map((a) => a.name), 'Cash'])];
}
