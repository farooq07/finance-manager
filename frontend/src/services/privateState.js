import { queryClient } from '../providers/QueryProvider';
import { clearVaultToken } from './goldVault';

/**
 * Forget everything the previous user could see: cancel requests in flight,
 * drop every cached query and lock the Gold Vault. Call on sign-out and
 * whenever the signed-in identity changes.
 */
export function clearPrivateState() {
    queryClient.cancelQueries();
    queryClient.clear();
    clearVaultToken();
}
