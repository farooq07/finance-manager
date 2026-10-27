// The Gold Vault unlock token: memory only, so closing the app (or 15 minutes)
// locks the vault again.
let token: string | null = null;
let expiresAt = 0;

export function setVaultToken(value: string | undefined, expiresInSeconds = 900) {
    token = value ?? null;
    expiresAt = value ? Date.now() + expiresInSeconds * 1000 : 0;
}

export function getVaultToken(): string | null {
    if (token && Date.now() < expiresAt) return token;
    token = null;
    return null;
}

export function clearVaultToken() {
    token = null;
    expiresAt = 0;
}
