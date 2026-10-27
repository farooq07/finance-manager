import { useState } from 'react';
import { toast } from 'sonner';
import { LogOut, Mail, Trash2, Download } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const card = 'rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5';
const h3 = 'flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100';
const p = 'mt-1 text-sm text-gray-500 dark:text-gray-400';

/** Privacy & sessions: email choices, sign out everywhere, data retention, account deletion. */
export default function PrivacyControls() {
    const { user, refreshUser, logout } = useAuth();
    const notifications = user?.notifications || { weeklySummary: true, billReminders: true };
    const [busy, setBusy] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [password, setPassword] = useState('');

    async function setNotification(key, value) {
        setBusy(key);
        try {
            await api.patch('/users/me/preferences', { notifications: { [key]: value } });
            await refreshUser();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Could not save');
        } finally {
            setBusy('');
        }
    }

    async function signOutOthers() {
        setBusy('sessions');
        try {
            const { data } = await api.post('/auth/sessions/revoke-all');
            if (data?.token) localStorage.setItem('token', data.token);
            toast.success('Signed out of every other device');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Could not sign out other devices');
        } finally {
            setBusy('');
        }
    }

    async function requestDeletion(e) {
        e.preventDefault();
        setBusy('delete');
        try {
            const { data } = await api.post('/users/me/deletion-request', { password });
            toast.success(data?.message || 'Account deactivated');
            logout();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Could not request deletion');
        } finally {
            setBusy('');
        }
    }

    return (
        <div className="space-y-4 max-w-2xl">
            <section className={card}>
                <h3 className={h3}><Mail className="w-4 h-4" aria-hidden="true" /> Emails</h3>
                <p className={p}>Sign-in codes and security emails are always sent.</p>
                {[
                    ['weeklySummary', 'Weekly summary', 'Your net worth and spending, every Sunday.'],
                    ['billReminders', 'Bill reminders', 'A few days before a recurring payment is due.'],
                ].map(([key, label, hint]) => (
                    <label key={key} className="mt-3 flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-emerald-600"
                            checked={notifications[key] !== false}
                            disabled={busy === key}
                            onChange={(e) => setNotification(key, e.target.checked)}
                        />
                        <span>
                            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>
                        </span>
                    </label>
                ))}
            </section>

            <section className={card}>
                <h3 className={h3}><LogOut className="w-4 h-4" aria-hidden="true" /> Devices</h3>
                <p className={p}>Lost a phone or used a shared computer? Sign out everywhere except here.</p>
                <button
                    type="button"
                    onClick={signOutOthers}
                    disabled={busy === 'sessions'}
                    className="mt-3 rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-60"
                >
                    {busy === 'sessions' ? 'Signing out…' : 'Sign out of all other devices'}
                </button>
            </section>

            <section className={card}>
                <h3 className={h3}><Download className="w-4 h-4" aria-hidden="true" /> Your data</h3>
                <p className={p}>
                    Everything you add stays until you delete it. Uploaded statement files are kept with their statement;
                    files you preview but don&apos;t import are removed within a day. Download all of it any time from
                    Settings → Export Data.
                </p>
            </section>

            <section className={`${card} border-red-200 dark:border-red-900/50`}>
                <h3 className={`${h3} text-red-700 dark:text-red-400`}><Trash2 className="w-4 h-4" aria-hidden="true" /> Delete my account</h3>
                <p className={p}>
                    Your account is deactivated straight away and you are signed out everywhere. An administrator then deletes it
                    and all its data permanently; until then it can be restored if you change your mind.
                </p>
                {!deleting ? (
                    <button
                        type="button"
                        onClick={() => setDeleting(true)}
                        className="mt-3 rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                        Delete my account…
                    </button>
                ) : (
                    <form onSubmit={requestDeletion} className="mt-3 flex flex-wrap items-center gap-2">
                        <label htmlFor="delete-password" className="sr-only">Your password</label>
                        <input
                            id="delete-password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            className="rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                        />
                        <button
                            type="submit"
                            disabled={busy === 'delete'}
                            className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                        >
                            {busy === 'delete' ? 'Requesting…' : 'Delete my account'}
                        </button>
                        <button type="button" onClick={() => { setDeleting(false); setPassword(''); }} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
                            Cancel
                        </button>
                        <p className="w-full text-xs text-gray-500 dark:text-gray-400">Signed in with Google? Leave the password empty — you may be asked to sign in again first.</p>
                    </form>
                )}
            </section>
        </div>
    );
}
