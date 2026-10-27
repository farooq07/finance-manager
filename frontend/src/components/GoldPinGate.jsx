import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGoldHasPin, useSetGoldPin, useVerifyGoldPin, useResetGoldPin } from '../hooks/useGold';
import { clearVaultToken, vaultMsLeft } from '../services/goldVault';

const PIN_LENGTH = 6;
const GOLD_AMBER = '#D4AF37';

/**
 * Wraps gold-vault content with a separate-PIN lock.
 * - First-time users see a "set your gold PIN" setup.
 * - Returning users see a numeric PIN entry sheet.
 * - Unlock state lives in component memory only — every navigation
 *   away re-locks (no SecureStore, no localStorage).
 */
export default function GoldPinGate({ children }) {
    const [unlocked, setUnlocked] = useState(false);
    const [resetting, setResetting] = useState(false);
    const { data: status, isLoading } = useGoldHasPin();
    const qc = useQueryClient();

    // Re-lock when the page unmounts (e.g. user navigates away): forget the
    // vault token and the vault data held in the cache.
    useEffect(() => {
        return () => {
            clearVaultToken();
            qc.removeQueries({ queryKey: ['gold-items'] });
            qc.removeQueries({ queryKey: ['gold-zakat'] });
            setUnlocked(false);
        };
    }, [qc]);

    // The server's vault token expires after 15 minutes — lock with it.
    useEffect(() => {
        if (!unlocked) return undefined;
        const ms = vaultMsLeft();
        if (!ms) return undefined;
        const t = setTimeout(() => {
            clearVaultToken();
            qc.removeQueries({ queryKey: ['gold-items'] });
            setUnlocked(false);
            toast.info('Gold Vault locked again');
        }, ms);
        return () => clearTimeout(t);
    }, [unlocked, qc]);

    if (isLoading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
        );
    }

    if (!status?.hasGoldPin) {
        return <GoldPinSetup onDone={() => setUnlocked(true)} />;
    }

    if (resetting) {
        return <GoldPinSetup reset onDone={() => { setResetting(false); setUnlocked(true); }} onCancel={() => setResetting(false)} />;
    }

    if (!unlocked) {
        return <GoldPinEntry onSuccess={() => setUnlocked(true)} onForgot={() => setResetting(true)} />;
    }

    return children;
}

function GoldPinSetup({ onDone, reset = false, onCancel }) {
    const [pin, setPin]       = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError]   = useState('');
    const createMutation = useSetGoldPin();
    const resetMutation = useResetGoldPin();
    const setMutation = reset ? resetMutation : createMutation;

    function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (pin.length < PIN_LENGTH || !/^\d+$/.test(pin)) {
            setError(`PIN must be exactly ${PIN_LENGTH} digits`);
            return;
        }
        if (pin !== confirm) {
            setError('PINs do not match');
            return;
        }
        setMutation.mutate(pin, {
            onSuccess: () => {
                toast.success(reset ? 'Gold Vault PIN reset' : 'Gold Vault PIN set');
                onDone();
            },
            onError: (err) => setError(err?.response?.data?.message || 'Could not set PIN'),
        });
    }

    return (
        <PinShell
            title={reset ? 'Reset your Gold Vault PIN' : 'Set up your Gold Vault PIN'}
            subtitle={reset
                ? 'For your safety this only works within 10 minutes of signing in with your password and emailed code.'
                : "A separate 6-digit PIN, just for the vault. We'll ask for it every time you open this page."}
            icon={ShieldCheck}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <PinInput value={pin}     onChange={setPin}     placeholder="6-digit PIN" autoFocus />
                <PinInput value={confirm} onChange={setConfirm} placeholder="Confirm PIN" />
                {error && <p className="text-sm text-rose-300">{error}</p>}
                <button
                    type="submit"
                    disabled={setMutation.isPending}
                    className="w-full py-3 rounded-xl font-medium text-neutral-900 transition-colors disabled:opacity-60"
                    style={{ backgroundColor: GOLD_AMBER }}
                >
                    {setMutation.isPending ? 'Saving…' : 'Set PIN & enter vault'}
                </button>
                {reset ? (
                    <button type="button" onClick={onCancel} className="w-full text-xs text-amber-200/70 hover:text-amber-100">
                        Back to PIN entry
                    </button>
                ) : (
                    <p className="text-xs text-amber-200/70 leading-relaxed text-center">
                        Forgot it later? Sign in again and use "Forgot PIN".<br />The vault PIN is not the same as your app PIN.
                    </p>
                )}
            </form>
        </PinShell>
    );
}

function GoldPinEntry({ onSuccess, onForgot }) {
    const [pin, setPin]   = useState('');
    const [error, setError] = useState('');
    const containerRef = useRef(null);
    const verify = useVerifyGoldPin();

    // Auto-submit when the user enters PIN_LENGTH digits.
    useEffect(() => {
        if (pin.length !== PIN_LENGTH) return;
        setError('');
        verify.mutate(pin, {
            onSuccess: (data) => {
                if (data.success) {
                    onSuccess();
                } else {
                    const left = data.attemptsLeft;
                    setError(typeof left === 'number'
                        ? (left > 0 ? `Incorrect PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Incorrect PIN. The vault is now locked for 15 minutes.')
                        : 'Incorrect PIN');
                    shake(containerRef.current);
                    setTimeout(() => setPin(''), 200);
                }
            },
            onError: (err) => {
                setError(err?.response?.data?.message || 'Could not verify PIN');
                setPin('');
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pin]);

    return (
        <PinShell
            title="Gold Vault"
            subtitle="Enter your private PIN"
            icon={Lock}
        >
            <div ref={containerRef} className="space-y-5">
                <PinDots length={PIN_LENGTH} filled={pin.length} />
                <Keypad
                    onDigit={(d) => setPin((p) => (p.length < PIN_LENGTH ? p + d : p))}
                    onBackspace={() => setPin((p) => p.slice(0, -1))}
                    disabled={verify.isPending}
                />
                <div className="h-5 text-center">
                    {verify.isPending && <span className="text-xs text-amber-200/70">Verifying…</span>}
                    {error && !verify.isPending && <span className="text-sm text-rose-300">{error}</span>}
                </div>
                <button type="button" onClick={onForgot} className="w-full text-xs text-amber-200/70 hover:text-amber-100">
                    Forgot PIN?
                </button>
            </div>
        </PinShell>
    );
}

// ── presentation primitives ─────────────────────────────────────────

function PinShell({ title, subtitle, icon: Icon, children }) {
    return (
        <div
            className="rounded-3xl p-8 md:p-12 text-center text-amber-50 shadow-xl"
            style={{
                background: 'radial-gradient(circle at top, #3a2614 0%, #1a0f08 60%, #0c0704 100%)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
            }}
        >
            <div
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5"
                style={{
                    background: 'rgba(212, 175, 55, 0.12)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                }}
            >
                <Icon className="w-8 h-8" style={{ color: GOLD_AMBER }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: GOLD_AMBER }}>{title}</h1>
            <p className="mt-2 text-sm text-amber-100/70 max-w-sm mx-auto">{subtitle}</p>
            <div className="mt-8 max-w-xs mx-auto">{children}</div>
        </div>
    );
}

function PinInput({ value, onChange, placeholder, autoFocus }) {
    return (
        <input
            type="password"
            inputMode="numeric"
            autoFocus={autoFocus}
            maxLength={PIN_LENGTH}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
            placeholder={placeholder}
            className="w-full text-center text-lg tracking-[0.5em] px-3 py-3 rounded-lg bg-black/40 border border-amber-400/30 text-amber-50 placeholder:text-amber-100/30 focus:outline-none focus:border-amber-400/60"
        />
    );
}

function PinDots({ length, filled }) {
    return (
        <div className="flex items-center justify-center gap-3">
            {Array.from({ length }).map((_, i) => (
                <span
                    key={i}
                    className="w-3 h-3 rounded-full transition-colors"
                    style={{
                        backgroundColor: i < filled ? GOLD_AMBER : 'transparent',
                        border: `1.5px solid ${i < filled ? GOLD_AMBER : 'rgba(212,175,55,0.35)'}`,
                    }}
                />
            ))}
        </div>
    );
}

function Keypad({ onDigit, onBackspace, disabled }) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    return (
        <div className="grid grid-cols-3 gap-3">
            {keys.map((k, i) => {
                if (!k) return <div key={i} />;
                const isBs = k === '⌫';
                return (
                    <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => (isBs ? onBackspace() : onDigit(k))}
                        className="h-12 rounded-xl text-lg font-medium text-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(212,175,55,0.18)',
                        }}
                        onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'rgba(212,175,55,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    >
                        {k}
                    </button>
                );
            })}
        </div>
    );
}

function shake(el) {
    if (!el) return;
    el.animate(
        [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-8px)' },
            { transform: 'translateX(8px)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' },
            { transform: 'translateX(0)' },
        ],
        { duration: 320, easing: 'ease-out' }
    );
}
