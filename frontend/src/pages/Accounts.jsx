import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Wallet as WalletIcon, Building2, MoreHorizontal, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import api from '../services/api';

// Mapping color themes to Tailwind gradients for the Credit Card UI
const CARD_THEMES = {
    blue: 'from-blue-600 to-blue-800',
    slate: 'from-neutral-800 to-neutral-900',
    emerald: 'from-emerald-600 to-emerald-800',
    rose: 'from-rose-600 to-rose-800',
    purple: 'from-fuchsia-600 to-fuchsia-800',
    amber: 'from-[#ff5018] to-[#ff5018]'
};

export default function Accounts() {
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
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white dark:bg-neutral-900 p-6 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-sm transition-colors">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Total Liquidity</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Aggregated balance across all your banks and mapped wallets.</p>
                </div>
                <div className="text-right">
                    <MaskedBalance value={totalLiquidity} className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight" />
                </div>
            </div>

            {/* Banks Section */}
            <section className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-neutral-800 pb-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Formal Banking
                    </h2>
                    <Button color="light" size="sm" onClick={() => setShowBankModal(true)}>
                        <Plus className="w-4 h-4 mr-1.5" /> Add Bank
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banks.length === 0 ? (
                        <div className="col-span-full py-8 text-center bg-gray-50 dark:bg-neutral-800/50 rounded-xl border border-gray-200 dark:border-neutral-700 border-dashed">
                            <Building2 className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No bank accounts linked yet.</p>
                        </div>
                    ) : (
                        banks.map((bank) => {
                            const isEditingBank = editBankId === bank.id;

                            return (
                                <div
                                    key={bank.id}
                                    className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 p-6 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/50 transition-all group flex flex-col relative"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <Link to={`/banks/${bank.id}`} className="block">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {bank.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">{bank.account_no}</p>
                                        </Link>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setEditBankId(bank.id);
                                                    setBankBalanceInput(bank.current_balance.toString());
                                                }}
                                                className="text-gray-400 hover:text-blue-500 p-1 h-8 w-8"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleBankDelete(e, bank.id)}
                                                className="text-gray-400 hover:text-red-500 p-1 h-8 w-8"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-auto space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">IBAN</p>
                                            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded inline-block">
                                                {bank.iban_no}
                                            </p>
                                        </div>
                                        <div className="flex items-end justify-between pt-4 border-t border-gray-100 dark:border-neutral-800">
                                            <div className="w-full">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Current Balance</p>
                                                {isEditingBank ? (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            className="bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded px-2 py-1 text-gray-900 dark:text-gray-100 w-full outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                                                            value={bankBalanceInput}
                                                            onChange={e => setBankBalanceInput(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleUpdateBankBalance(e, bank.id);
                                                                if (e.key === 'Escape') setEditBankId(null);
                                                            }}
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            color="blue"
                                                            onClick={(e) => handleUpdateBankBalance(e, bank.id)}
                                                            className="px-3 py-1.5 font-bold h-8"
                                                        >
                                                            Save
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-gray-500 font-semibold">{bank.currency || 'PKR'}</span>
                                                            <MaskedBalance value={bank.current_balance} className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100" showSymbol={false} />
                                                        </div>
                                                        {bank.currency && bank.currency !== 'PKR' && (
                                                            <span className="text-xs text-gray-400">≈ {fmtPKR(bank.current_balance * (bank.exchange_rate || 1))}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {!isEditingBank && (
                                                <Link to={`/banks/${bank.id}`}>
                                                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
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
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowWalletModal(true)}
                        className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> Add Wallet
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wallets.map(wallet => {
                        const bgGradient = CARD_THEMES[wallet.color_theme] || CARD_THEMES.blue;
                        const isEditing = editWalletId === wallet.id;

                        return (
                            <div key={wallet.id} className="relative group">
                                {/* Card UI */}
                                <div className={`h-48 rounded-2xl p-6 flex flex-col justify-between text-white shadow-lg bg-gradient-to-br ${bgGradient} relative overflow-hidden transition-transform transform hover:-tranneutral-y-1`}>
                                    {/* Decorative rings */}
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full border-4 border-white/10"></div>
                                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full border-4 border-white/10"></div>

                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">{wallet.institution}</h3>
                                            <p className="text-white/80 text-sm font-medium">{wallet.name}</p>
                                        </div>
                                        <WalletIcon className="w-8 h-8 opacity-50" />
                                    </div>

                                    <div className="relative z-10">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    className="bg-white/20 border border-white/30 rounded px-2 py-1 text-white placeholder-white/50 w-full outline-none focus:ring-2 focus:ring-white/50"
                                                    placeholder="New Balance"
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
                                                    className="bg-white text-gray-900 text-xs px-3 py-1.5 font-bold hover:bg-gray-100 h-8"
                                                >
                                                    Save
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-white/70 mb-1">Available Balance</p>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center">
                                                        <span className="text-white/70 font-semibold mr-1">{wallet.currency || 'PKR'}</span>
                                                        <MaskedBalance value={wallet.balance} className="text-3xl font-bold tracking-tight" iconClassName="text-white hover:text-white bg-white/20 p-1.5 ml-2 hover:bg-white/30" showSymbol={false} />
                                                    </div>
                                                    {wallet.currency && wallet.currency !== 'PKR' && (
                                                        <span className="text-xs text-white/60 mt-1">≈ {fmtPKR(wallet.balance * (wallet.exchange_rate || 1))}</span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="relative z-10 flex justify-between items-end">
                                        <p className="tracking-widest opacity-80 font-mono text-sm">
                                            •••• {wallet.account_num ? wallet.account_num.slice(-4) : 'XXXX'}
                                        </p>

                                        {/* Action Buttons (visible on hover) */}
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setEditWalletId(wallet.id);
                                                    setBalanceInput(wallet.balance.toString());
                                                }}
                                                className="p-1.5 bg-white/20 rounded hover:bg-white/30 backdrop-blur-sm h-8 w-8 text-white"
                                                title="Update Balance"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleWalletDelete(wallet.id)}
                                                className="p-1.5 bg-red-500/80 rounded hover:bg-red-500 backdrop-blur-sm h-8 w-8 text-white"
                                                title="Delete Account"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Blank Add Card Slot */}
                    <Button
                        variant="outline"
                        onClick={() => setShowWalletModal(true)}
                        className="h-48 rounded-2xl border-2 border-dashed border-gray-300 dark:border-neutral-700 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800/50 bg-transparent"
                    >
                        <Plus className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">Link New Wallet</span>
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
