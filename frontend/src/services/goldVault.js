// The Gold Vault unlock token lives in memory only — never in storage — so a
// reload, sign-out or leaving the vault page locks it again.
let vaultToken = null;
let expiresAt = 0;

export function setVaultToken(token, expiresInSeconds) {
    vaultToken = token || null;
    expiresAt = token ? Date.now() + (expiresInSeconds || 0) * 1000 : 0;
}

export function getVaultToken() {
    if (vaultToken && Date.now() < expiresAt) return vaultToken;
    vaultToken = null;
    return null;
}

export function vaultMsLeft() {
    return getVaultToken() ? expiresAt - Date.now() : 0;
}

export function clearVaultToken() {
    vaultToken = null;
    expiresAt = 0;
}
