import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Wallet as WalletIcon, Building2, MoreHorizontal, ArrowRight, Eye, EyeOff, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Beneficiaries from './Beneficiaries';
import { useWallets, useCreateWallet, useUpdateWalletBalance, useDeleteWallet } from '../hooks/useWallets';
import { useBanks, useCreateBank, useUpdateBankBalance, useDeleteBank } from '../hooks/useBanks';
import { useInstitutions } from '../hooks/useInstitutions';
import Button from '../components/Button';
import TextInput from '../components/TextInput';
import { fmtPKR } from '../utils/currency';
import { CardSkeleton } from '../components/Skeleton';
import Select from '../components/Select';
import { toast } from 'sonner';
import MaskedBalance from '../components/MaskedBalance';
import Modal from '../components/Modal';
import api from '../services/api';
import { Card, CardTitle, CardHeader, CardContent } from '@/components/ui/card';

// Mapping color themes to Tailwind gradients for the Credit Card UI
const CARD_THEMES = {
    blue: 'from-blue-600 to-blue-800',
    slate: 'from-neutral-800 to-neutral-900',
    emerald: 'from-emerald-600 to-emerald-800',
    rose: 'from-rose-600 to-rose-800',
    purple: 'from-fuchsia-600 to-fuchsia-800',
    amber: 'from-[#ff5018] to-[#ff5018]'
};

/* ─── Brand-aware card colour pickers (Pakistan banks + local wallets) ─── */
function bankCardColor(bank) {
    const key = `${bank.name || ''} ${bank.institution || ''}`.toLowerCase();
    if (key.includes('standard chartered') || key.includes('scbl')) return '#0c77b9';
    if (key.includes('habib metro')) return '#0a6f47';
    if (key.includes('habib bank') || key === 'hbl' || key.startsWith('hbl ')) return '#1a8556';
    if (key.includes('meezan')) return '#005c4a';
    if (key.includes('mcb')) return '#003e7e';
    if (key.includes('alfalah')) return '#5c3697';
    if (key.includes('askari')) return '#0b6b3a';
    if (key.includes('ubl') || key.includes('united bank')) return '#063a8e';
    if (key.includes('faysal')) return '#0e7c3f';
    if (key.includes('al baraka')) return '#1d4ed8';
    if (key.includes('soneri')) return '#b91c1c';
    return '#1F4842'; // primary-700 fallback
}

const WALLET_THEME_COLOR = {
    blue: '#1d4ed8',
    slate: '#1f2937',
    emerald: '#0a6f47',
    rose: '#b8005c',
    purple: '#5c3697',
    amber: '#ff5018',
};

function walletCardColor(wallet) {
    const key = `${wallet.name || ''} ${wallet.institution || ''}`.toLowerCase();
    if (key.includes('naya')) return '#ff5018';
    if (key.includes('jazz')) return '#b8005c';
    if (key.includes('easy')) return '#0a6f47';
    if (key.includes('upaisa')) return '#5c3697';
    if (key.includes('sadapay')) return '#0c0c0c';
    if (wallet.color_theme && WALLET_THEME_COLOR[wallet.color_theme]) {
        return WALLET_THEME_COLOR[wallet.color_theme];
    }
    return '#1F4842';
}

function monogram(name = '') {
    const cleaned = name.replace(/[^A-Za-z\s]/g, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'A';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

function lastFour(s = '') {
    const digits = (s || '').replace(/\D/g, '');
    return digits.slice(-4) || 'XXXX';
}

/* Tiny sparkline — synthesizes a believable trend so the ledger card has
   quiet visual life. `stroke` lets each card draw it in its own brand ink. */
function CardSparkline({ seed = 0, stroke = 'currentColor' }) {
    // Deterministic-ish wobble around an upward trend
    const points = Array.from({ length: 14 }, (_, i) => {
        const base = 38 - i * 1.6;
        const wobble = Math.sin((i + seed) * 1.3) * 4;
        return Math.max(4, Math.min(40, base + wobble));
    });
    const d = points.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * 180},${y}`).join(' ');
    return (
        <svg viewBox="0 0 180 48" className="w-full h-9" preserveAspectRatio="none">
            <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* ─── Bank card — two-pane: white identity left, coloured balance + sparkline right ─── */
function BankCard({ bank, onEditBalance, onDelete, isEditing, balanceInput, setBalanceInput, onSaveBalance, onCancelEdit }) {
    const color = bankCardColor(bank);
    const seed = (bank.name?.charCodeAt(0) || 0) + (bank.account_no?.length || 0);

    return (
        <div className="group relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl transition-colors hover:border-gray-300 dark:hover:border-neutral-700">
            {/* Hover actions (top-right) */}
            <div className="absolute top-2.5 right-2.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditBalance(); }}
                    className="h-7 w-7bg-white/90 dark:bg-neutral-800/90 text-gray-500 hover:text-primary-600 backdrop-blur-sm"
                    title="Edit balance"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-7 w-7bg-white/90 dark:bg-neutral-800/90 text-gray-500 hover:text-error-600 backdrop-blur-sm"
                    title="Delete bank"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>

            <div className="p-5">
                {/* Identity row */}
                <div className="flex items-center gap-3">
                    <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold tracking-wide shrink-0"
                        style={{ background: color }}
                    >
                        {monogram(bank.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">{bank.name}</h3>
                        <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-0.5 truncate">{bank.account_no}</p>
                    </div>
                    <span className="self-start text-[9px] font-mono font-semibold tracking-[0.22em] uppercase text-gray-400 dark:text-gray-500 shrink-0">Bank</span>
                </div>

                {/* Balance */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                type="number"
                                className="flex-1 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-gray-900 dark:text-gray-100 text-base font-semibold tabular-nums outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-neutral-600"
                                value={balanceInput}
                                onChange={(e) => setBalanceInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveBalance(e);
                                    if (e.key === 'Escape') onCancelEdit();
                                }}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            />
                            <Button size="sm" onClick={onSaveBalance} className="rounded-lg text-white hover:opacity-90 h-9 px-4 font-semibold shrink-0" style={{ background: color }}>
                                Save
                            </Button>
                        </div>
                    ) : (
                        <>
                            <p className="text-[9.5px] font-semibold tracking-[0.22em] uppercase text-gray-400 dark:text-gray-500">Current balance</p>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{bank.currency || 'PKR'}</span>
                                <MaskedBalance
                                    value={bank.current_balance}
                                    className="text-[26px] leading-none font-bold tabular-nums tracking-tight text-gray-900 dark:text-gray-100"
                                    iconClassName="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    showSymbol={false}
                                />
                            </div>
                            <div className="mt-2 -mb-1" style={{ color }}>
                                <CardSparkline seed={seed} stroke={color} />
                            </div>
                        </>
                    )}
                </div>

                {bank.iban_no && (
                    <p className="mt-3 text-[11px] font-mono text-gray-500 dark:text-gray-400 break-all">
                        <span className="tracking-[0.16em] uppercase text-[9px] text-gray-400 dark:text-gray-500 mr-1.5">IBAN</span>{bank.iban_no}
                    </p>
                )}

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                    <p className="font-mono text-[12px] tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        •••• •••• {lastFour(bank.account_no)}
                    </p>
                    <Link
                        to={`/banks/${bank.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Statements <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

/* ─── Tab shell ─ My Accounts (banks + wallets) | Beneficiaries ───────── */
const ACCOUNT_TABS = [
    { key: 'accounts', label: 'My Accounts', icon: WalletIcon },
    { key: 'beneficiaries', label: 'Beneficiaries', icon: Users },
];
const VALID_ACCOUNT_TABS = ACCOUNT_TABS.map((t) => t.key);

export default function Accounts() {
    const [searchParams, setSearchParams] = useSearchParams();
    const requested = searchParams.get('tab');
    const active = VALID_ACCOUNT_TABS.includes(requested) ? requested : 'accounts';
    const setTab = (key) => setSearchParams(key === 'accounts' ? {} : { tab: key }, { replace: true });

    return (
        <div className="space-y-6">
            <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800/60 p-1 rounded-xl w-fit">
                {ACCOUNT_TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                            ${active === key
                                ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {active === 'beneficiaries' ? <Beneficiaries /> : <AccountsList />}
        </div>
    );
}

function AccountsList() {
    const { data: wallets = [], isLoading: loadingWallets } = useWallets();
    const { data: banks = [], isLoading: loadingBanks } = useBanks();
    const { data: institutions = [] } = useInstitutions();

    // Mutations for Wallets
    const createWallet = useCreateWallet();
    const updateWalletBalance = useUpdateWalletBalance();
    const deleteWallet = useDeleteWallet();

    // Mutations for Banks
    const createBank = useCreateBank();
    const updateBankBalance = useUpdateBankBalance();
    const deleteBank = useDeleteBank();

    // UI States
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [editWalletId, setEditWalletId] = useState(null);
    const [balanceInput, setBalanceInput] = useState('');
    const [editBankId, setEditBankId] = useState(null);
    const [bankBalanceInput, setBankBalanceInput] = useState('');
    const [deleteWalletModal, setDeleteWalletModal] = useState({ isOpen: false, id: null });
    const [deleteBankModal, setDeleteBankModal] = useState({ isOpen: false, id: null });

    // Form states
    const [walletForm, setWalletForm] = useState({ name: '', institution_id: '', balance: '', color_theme: 'blue', account_num: '', currency: 'PKR', exchange_rate: '1' });
    const [bankForm, setBankForm] = useState({ name: '', institution_id: '', account_no: '', iban_no: '', starting_balance: '', currency: 'PKR', exchange_rate: '1' });

    if (loadingWallets || loadingBanks) return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Accounts</h1>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded mt-2" />
                </div>
                <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CardSkeleton />
                <CardSkeleton />
            </div>
        </div>
    );

    const totalWalletBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
    const totalBankBalance = banks.reduce((sum, b) => sum + Number(b.current_balance), 0);
    const totalLiquidity = totalWalletBalance + totalBankBalance;

    const handleWalletCreate = async (e) => {
        e.preventDefault();
        try {
            const selectedInst = institutions.find(i => i.id === walletForm.institution_id);
            if (!selectedInst) return toast.error('Please select a valid institution');

            await createWallet.mutateAsync({
                ...walletForm,
                institution: selectedInst.name,
                balance: Number(walletForm.balance || 0),
                currency: walletForm.currency,
                exchange_rate: Number(walletForm.exchange_rate || 1)
            });
            setShowWalletModal(false);
            setWalletForm({ name: '', institution_id: '', balance: '', color_theme: 'blue', account_num: '', currency: 'PKR', exchange_rate: '1' });
            toast.success('Wallet created successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create wallet');
        }
    };

    const handleUpdateWalletBalance = async (id) => {
        if (!balanceInput && balanceInput !== '0') return;
        try {
            await updateWalletBalance.mutateAsync({ id, balance: balanceInput });
            setEditWalletId(null);
            setBalanceInput('');
            toast.success('Balance updated');
        } catch (error) {
            toast.error('Failed to update balance');
        }
    };

    const handleWalletDelete = async (id) => {
        setDeleteWalletModal({ isOpen: true, id });
    };

    const confirmWalletDelete = async () => {
        if (deleteWalletModal.id) {
            await deleteWallet.mutateAsync(deleteWalletModal.id);
            setDeleteWalletModal({ isOpen: false, id: null });
            toast.success('Wallet deleted successfully');
        }
    };

    const handleBankCreate = async (e) => {
        e.preventDefault();
        try {
            const selectedInst = institutions.find(i => i.id === bankForm.institution_id);
            if (!selectedInst) return toast.error('Please select a valid bank institution');

            await createBank.mutateAsync({
                name: selectedInst.name,
                account_no: bankForm.account_no,
                iban_no: bankForm.iban_no,
                starting_balance: Number(bankForm.starting_balance),
                currency: bankForm.currency,
                exchange_rate: Number(bankForm.exchange_rate || 1)
            });
            setShowBankModal(false);
            setBankForm({ name: '', institution_id: '', account_no: '', iban_no: '', starting_balance: '', currency: 'PKR', exchange_rate: '1' });
            toast.success('Bank created successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create bank');
        }
    };

    const handleBankDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteBankModal({ isOpen: true, id });
    };

    const confirmBankDelete = async () => {
        if (deleteBankModal.id) {
            await deleteBank.mutateAsync(deleteBankModal.id);
            setDeleteBankModal({ isOpen: false, id: null });
            toast.success('Bank account deleted successfully');
        }
    };

    const handleUpdateBankBalance = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!bankBalanceInput && bankBalanceInput !== '0') return;
        try {
            await updateBankBalance.mutateAsync({ id, current_balance: bankBalanceInput });
            setEditBankId(null);
            setBankBalanceInput('');
            toast.success('Bank balance updated');
        } catch (error) {
            toast.error('Failed to update bank balance');
        }
    };

    const formatInstitutionOptions = (filterType) => {
        return institutions
            .filter(i => filterType === 'all' || i.type === filterType)
            .map(i => ({
                value: i.id,
                label: i.name,
                avatar: `https://ui-avatars.com/api/?name=${i.name}&background=random`
            }));
    };

    return (
        <div className="space-y-10 max-w-7xl mx-auto">
            {/* Header */}
            <Card className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-6 transition-colors">
                <div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Total Liquidity</CardTitle>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Aggregated balance across all your banks and mapped wallets.</p>
                </div>
                <div className="text-right">
                    <MaskedBalance value={totalLiquidity} className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight" />
                </div>
            </Card>

            {/* Banks Section */}
            <section className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-neutral-800 pb-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Formal Banking
                    </h2>
                    <Button color="primary" size="sm" onClick={() => setShowBankModal(true)}>
                        <Plus className="w-4 h-4 mr-1.5" /> Add Bank
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {banks.length === 0 ? (
                        <div className="col-span-full py-8 text-center bg-gray-50 dark:bg-neutral-800/50 rounded-xl border border-gray-200 dark:border-neutral-700 border-dashed">
                            <Building2 className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No bank accounts linked yet.</p>
                        </div>
                    ) : (
                        banks.map((bank) => (
                            <BankCard
                                key={bank.id}
                                bank={bank}
                                isEditing={editBankId === bank.id}
                                balanceInput={bankBalanceInput}
                                setBalanceInput={setBankBalanceInput}
                                onEditBalance={() => {
                                    setEditBankId(bank.id);
                                    setBankBalanceInput(bank.current_balance?.toString() ?? '');
                                }}
                                onSaveBalance={(e) => handleUpdateBankBalance(e, bank.id)}
                                onCancelEdit={() => { setEditBankId(null); setBankBalanceInput(''); }}
                                onDelete={(e) => handleBankDelete(e, bank.id)}
                            />
                        ))
                    )}
                </div>
            </section>

            {/* Wallets & Cash Section */}
            <section className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-neutral-800 pb-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <WalletIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> Wallets & Cash
                    </h2>
                    <Button
                        color="primary"
                        size="sm"
                        onClick={() => setShowWalletModal(true)}
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> Add Wallet
                    </Button>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wallets.map(wallet => {
                        const color = walletCardColor(wallet);
                        const isEditing = editWalletId === wallet.id;

                        return (
                            <Card key={wallet.id} className="relative group h-48 transition-colors hover:border-gray-300 dark:hover:border-neutral-700 flex flex-col p-5">
                                {/* Identity row */}
                                <div className="flex items-center gap-3">
                                    <span
                                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold tracking-wide shrink-0"
                                        style={{ background: color }}
                                    >
                                        {monogram(wallet.institution || wallet.name)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">{wallet.institution}</h3>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{wallet.name}</p>
                                    </div>
                                    <span className="self-start text-[9px] font-mono font-semibold tracking-[0.22em] uppercase text-gray-400 dark:text-gray-500 shrink-0">Wallet</span>
                                </div>

                                {/* Balance */}
                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-neutral-800">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                type="number"
                                                className="flex-1 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-gray-900 dark:text-gray-100 text-base font-semibold tabular-nums outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-neutral-600"
                                                placeholder="New balance"
                                                value={balanceInput}
                                                onChange={e => setBalanceInput(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleUpdateWalletBalance(wallet.id);
                                                    if (e.key === 'Escape') setEditWalletId(null);
                                                }}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleUpdateWalletBalance(wallet.id)}
                                                className="rounded-lg text-white text-xs px-4 h-9 font-semibold shrink-0 hover:opacity-90"
                                                style={{ background: color }}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-[9.5px] font-semibold tracking-[0.22em] uppercase text-gray-400 dark:text-gray-500">Available balance</p>
                                            <div className="mt-1 flex items-baseline gap-2">
                                                <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{wallet.currency || 'PKR'}</span>
                                                <MaskedBalance value={wallet.balance} className="text-[26px] leading-none font-bold tabular-nums tracking-tight text-gray-900 dark:text-gray-100" iconClassName="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" showSymbol={false} />
                                            </div>
                                            {wallet.currency && wallet.currency !== 'PKR' && (
                                                <span className="block text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">≈ {fmtPKR(wallet.balance * (wallet.exchange_rate || 1))}</span>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Footer — masked number + hover actions */}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                                    <p className="font-mono text-[12px] tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                        •••• {wallet.account_num ? wallet.account_num.slice(-4) : 'XXXX'}
                                    </p>

                                    {/* Action Buttons (visible on hover) */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link to={`/wallets/${wallet.id}`}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7bg-white dark:bg-neutral-800 text-gray-500 hover:text-primary-600"
                                                title="View Statements & Transactions"
                                            >
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditWalletId(wallet.id);
                                                setBalanceInput(wallet.balance.toString());
                                            }}
                                            className="h-7 w-7bg-white dark:bg-neutral-800 text-gray-500 hover:text-primary-600"
                                            title="Update Balance"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleWalletDelete(wallet.id)}
                                            className="h-7 w-7bg-white dark:bg-neutral-800 text-gray-500 hover:text-error-600"
                                            title="Delete Account"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}

                    {/* Blank Add Card Slot */}
                    <Button
                        variant="outline"
                        onClick={() => setShowWalletModal(true)}
                        className="h-48 rounded-xl border border-dashed border-gray-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800/50 bg-transparent"
                    >
                        <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        <span className="text-xs font-semibold tracking-[0.18em] uppercase">Link new wallet</span>
                    </Button>
                </div>
            </section>

            {/* Create Wallet Modal */}
            {showWalletModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 transition-colors">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Wallet or Cash</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowWalletModal(false)}
                                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full"
                            >
                                ✕
                            </Button>
                        </div>

                        <form onSubmit={handleWalletCreate} className="p-6 space-y-4">
                            <div>
                                <Select
                                    label="Wallets"
                                    options={formatInstitutionOptions('wallet')} // Include cash/other? we can filter differently later if needed
                                    value={walletForm.institution_id}
                                    onChange={(val) => setWalletForm({ ...walletForm, institution_id: val })}
                                    placeholder="Select provider..."
                                    error={institutions.length === 0 ? "Please add Banks via Console Settings first." : undefined}
                                />
                            </div>

                            <div>
                                <div className="mb-1 block">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Nickname</label>
                                </div>
                                <TextInput id="wallet-name" required type="text" placeholder="e.g. My Everyday Wallet" value={walletForm.name} onChange={e => setWalletForm({ ...walletForm, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Starting Balance</label>
                                    </div>
                                    <TextInput id="wallet-balance" required type="number" step="0.01" min="0" value={walletForm.balance} onChange={e => setWalletForm({ ...walletForm, balance: e.target.value })} />
                                </div>
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last 4 Digits <span className="text-gray-400 dark:text-gray-500 text-xs">(optional)</span></label>
                                    </div>
                                    <TextInput id="wallet-digits" type="text" maxLength="4" placeholder="1234" value={walletForm.account_num} onChange={e => setWalletForm({ ...walletForm, account_num: e.target.value })} className="font-mono tracking-widest" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-neutral-800 pt-4">
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                                    </div>
                                    <Select
                                        options={[
                                            { value: 'PKR', label: 'PKR - Pakistan Rupee' },
                                            { value: 'USD', label: 'USD - US Dollar' },
                                            { value: 'SAR', label: 'SAR - Saudi Riyal' },
                                            { value: 'GBP', label: 'GBP - British Pound' },
                                            { value: 'EUR', label: 'EUR - Euro' },
                                            { value: 'AED', label: 'AED - UAE Dirham' }
                                        ]}
                                        value={walletForm.currency}
                                        onChange={(val) => setWalletForm({ ...walletForm, currency: val, exchange_rate: val === 'PKR' ? '1' : '' })}
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Exchange Rate <span className="text-xs text-gray-400">(to PKR)</span></label>
                                    </div>
                                    <TextInput
                                        id="wallet-rate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        disabled={walletForm.currency === 'PKR'}
                                        value={walletForm.exchange_rate}
                                        onChange={e => setWalletForm({ ...walletForm, exchange_rate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Card Color Theme</label>
                                <div className="flex gap-3">
                                    {Object.keys(CARD_THEMES).map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setWalletForm({ ...walletForm, color_theme: color })}
                                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${CARD_THEMES[color]} ${walletForm.color_theme === color ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-gray-100 dark:ring-offset-neutral-900 border-2 border-white dark:border-neutral-900' : 'opacity-70 hover:opacity-100'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button color="light" onClick={() => setShowWalletModal(false)}>Cancel</Button>
                                <Button type="submit" color="blue" disabled={createWallet.isPending || institutions.length === 0}>
                                    {createWallet.isPending ? 'Adding Wallet...' : 'Add Wallet'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Bank Modal */}
            {showBankModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 transition-colors">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Formal Bank Account</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowBankModal(false)}
                                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full"
                            >
                                ✕
                            </Button>
                        </div>

                        <form onSubmit={handleBankCreate} className="p-6 space-y-4">
                            <div>
                                <Select
                                    label="Bank Institution"
                                    options={formatInstitutionOptions('bank')}
                                    value={bankForm.institution_id}
                                    onChange={(val) => setBankForm({ ...bankForm, institution_id: val })}
                                    placeholder="Select bank..."
                                    error={formatInstitutionOptions('bank').length === 0 ? "Please add a Formal Bank via Console Settings first." : undefined}
                                />
                            </div>

                            <div>
                                <div className="mb-1 block">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</label>
                                </div>
                                <TextInput id="bank-acc" required type="text" value={bankForm.account_no} onChange={e => setBankForm({ ...bankForm, account_no: e.target.value })} className="font-mono" />
                            </div>

                            <div>
                                <div className="mb-1 block">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">IBAN Number</label>
                                </div>
                                <TextInput id="bank-iban" required type="text" value={bankForm.iban_no} onChange={e => setBankForm({ ...bankForm, iban_no: e.target.value })} className="font-mono uppercase" />
                            </div>

                            <div>
                                <div className="mb-1 block">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Starting Balance</label>
                                </div>
                                <TextInput id="bank-balance" required type="number" step="0.01" value={bankForm.starting_balance} onChange={e => setBankForm({ ...bankForm, starting_balance: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-neutral-800 pt-4">
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                                    </div>
                                    <Select
                                        options={[
                                            { value: 'PKR', label: 'PKR - Pakistan Rupee' },
                                            { value: 'USD', label: 'USD - US Dollar' },
                                            { value: 'SAR', label: 'SAR - Saudi Riyal' },
                                            { value: 'GBP', label: 'GBP - British Pound' },
                                            { value: 'EUR', label: 'EUR - Euro' },
                                            { value: 'AED', label: 'AED - UAE Dirham' }
                                        ]}
                                        value={bankForm.currency}
                                        onChange={(val) => setBankForm({ ...bankForm, currency: val, exchange_rate: val === 'PKR' ? '1' : '' })}
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Exchange Rate <span className="text-xs text-gray-400">(to PKR)</span></label>
                                    </div>
                                    <TextInput
                                        id="bank-rate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        disabled={bankForm.currency === 'PKR'}
                                        value={bankForm.exchange_rate}
                                        onChange={e => setBankForm({ ...bankForm, exchange_rate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button color="light" onClick={() => setShowBankModal(false)}>Cancel</Button>
                                <Button type="submit" color="blue" disabled={createBank.isPending || formatInstitutionOptions('bank').length === 0}>
                                    {createBank.isPending ? 'Linking Bank...' : 'Link Bank'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Delete Wallet Modal */}
            <Modal
                isOpen={deleteWalletModal.isOpen}
                onClose={() => setDeleteWalletModal({ isOpen: false, id: null })}
                title="Delete Wallet"
                description="Are you sure you want to delete this wallet? This cannot be undone."
                type="danger"
                primaryAction={{
                    label: 'Delete Wallet',
                    onClick: confirmWalletDelete,
                    isLoading: deleteWallet.isPending,
                    variant: 'danger'
                }}
                secondaryAction={{
                    label: 'Cancel',
                    onClick: () => setDeleteWalletModal({ isOpen: false, id: null })
                }}
            />

            {/* Delete Bank Modal */}
            <Modal
                isOpen={deleteBankModal.isOpen}
                onClose={() => setDeleteBankModal({ isOpen: false, id: null })}
                title="Delete Bank Account"
                description="Are you sure you want to delete this bank account? This will remove all associated history."
                type="danger"
                primaryAction={{
                    label: 'Delete Bank',
                    onClick: confirmBankDelete,
                    isLoading: deleteBank.isPending,
                    variant: 'danger'
                }}
                secondaryAction={{
                    label: 'Cancel',
                    onClick: () => setDeleteBankModal({ isOpen: false, id: null })
                }}
            />

        </div>
    );
}
