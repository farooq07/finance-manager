// Shapes returned by the WealthAxis backend (same API as the web app).

export type User = {
    id: string;
    name?: string;
    email?: string;
    role: string;
    hasPin?: boolean;
    must_change_password?: boolean;
    /** null = still needs onboarding; undefined = older response, never trapped */
    onboarded_at?: string | null;
    /** null/undefined = show everything; [] = core only */
    interests?: string[] | null;
    notifications?: { weeklySummary: boolean; billReminders: boolean };
};

export type LoginResult = { userId: string; email: string; requiresOtp: true };
export type SessionResult = { token: string; user: User; mustChangePassword?: boolean };
export type AuthConfig = { googleEnabled: boolean; googleClientId: string | null };

export type Bank = { id: string; name: string; current_balance: string | number };
export type Wallet = { id: string; name: string; balance: string | number; exchange_rate?: string | number | null };

export type DashboardSummary = { metrics: { netWorth: number; [key: string]: number } };

export type Preferences = { onboarded_at: string | null; interests: string[] | null };
