import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../services/api';
import { Button } from '@/components/ui/button';

/**
 * The broker PIN is stored encrypted and never sent in the account list.
 * Showing it asks the server, which wants the app PIN first.
 */
export default function BrokerPinReveal({ broker }) {
    const [revealed, setRevealed] = useState(null);
    const [asking, setAsking] = useState(false);
    const [appPin, setAppPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    if (!broker.has_stock_pin) {
        return <p className="font-mono text-gray-500 dark:text-gray-400">Not set</p>;
    }

    const hide = () => { setRevealed(null); setAsking(false); setAppPin(''); setError(''); };

    const reveal = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const { data } = await api.post(`/broker-accounts/${broker.id}/reveal-pin`, { appPin });
            setRevealed(data.stock_pin_code ?? '');
            setAsking(false);
            setAppPin('');
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not show the PIN');
        } finally {
            setBusy(false);
        }
    };

    if (asking) {
        return (
            <form onSubmit={reveal} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <input
                        type="password"
                        inputMode="numeric"
                        autoFocus
                        maxLength={6}
                        value={appPin}
                        onChange={(e) => setAppPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="App PIN"
                        aria-label="Your app PIN"
                        className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-neutral-900 px-2 py-1 font-mono text-sm text-gray-900 dark:text-gray-100"
                    />
                    <Button type="submit" size="sm" disabled={busy || appPin.length < 4}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Show'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={hide}>Cancel</Button>
                </div>
                {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            </form>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <p className="font-mono text-red-700 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                {revealed !== null ? revealed : '••••••••'}
            </p>
            <Button
                variant="ghost"
                size="icon"
                aria-label={revealed !== null ? 'Hide PIN' : 'Show PIN'}
                onClick={(e) => { e.preventDefault(); revealed !== null ? hide() : setAsking(true); }}
                className="h-8 w-8 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            >
                {revealed !== null ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
        </div>
    );
}
