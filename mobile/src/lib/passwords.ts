/** New passwords: at least 8 characters (the server enforces the same rule). */
export const PASSWORD_MIN = 8;

export function passwordProblem(password: string): string | null {
    if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
    if (password.length > 128) return 'Password must be at most 128 characters';
    return null;
}
