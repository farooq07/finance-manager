import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Wallet as WalletIcon, Building2, MoreHorizontal, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWallets, useCreateWallet, useUpdateWalletBalance, useDeleteWallet } from '../hooks/useWallets';
import { useBanks, useCreateBank, useDeleteBank } from '../hooks/useBanks';
import { useInstitutions } from '../hooks/useInstitutions';
import { Button, TextInput } from 'flowbite-react';
import { fmtPKR } from '../utils/currency';
import { CardSkeleton } from '../components/Skeleton';
import Select from '../components/Select';
import toast from 'react-hot-toast';

// Mapping color themes to Tailwind gradients for the Credit Card UI
const CARD_THEMES = {
    blue: 'from-blue-600 to-blue-800',
    slate: 'from-neutral-800 to-neutral-900',
    emerald: 'from-emerald-600 to-emerald-800',
    rose: 'from-rose-600 to-rose-800',
    purple: 'from-fuchsia-600 to-fuchsia-800',
    amber: 'from-amber-500 to-orange-600'
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
    const deleteBank = useDeleteBank();

    // UI States
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [editWalletId, setEditWalletId] = useState(null);
    const [balanceInput, setBalanceInput] = useState('');

    // Form states
    const [walletForm, setWalletForm] = useState({ name: '', institution_id: '', balance: '', color_theme: 'blue', account_num: '' });
    const [bankForm, setBankForm] = useState({ name: '', institution_id: '', account_no: '', iban_no: '', starting_balance: '' });

    // Security States
    const [revealedBankIds, setRevealedBankIds] = useState([]);
    const [pinModal, setPinModal] = useState({ isOpen: false, targetId: null, pin: '', loading: false });

    const toggleBalanceReveal = (e, bankId) => {
        e.preventDefault();
        e.stopPropagation();
        if (revealedBankIds.includes(bankId)) {
            // Instantly lock
            setRevealedBankIds(prev => prev.filter(id => id !== bankId));
        } else {
            // Prompt for PIN to unlock
            setPinModal({ isOpen: true, targetId: bankId, pin: '', loading: false });
        }
    };

    const handleVerifyPin = async (e) => {
        e.preventDefault();
        setPinModal(prev => ({ ...prev, loading: true }));
        try {
            await api.post('/auth/verify-pin', { pin: pinModal.pin });
            setRevealedBankIds(prev => [...prev, pinModal.targetId]);
            setPinModal({ isOpen: false, targetId: null, pin: '', loading: false });
            toast.success("Balance Unlocked");
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid PIN');
            setPinModal(prev => ({ ...prev, loading: false }));
        }
    };

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
                balance: Number(walletForm.balance || 0)
            });
            setShowWalletModal(false);
            setWalletForm({ name: '', institution_id: '', balance: '', color_theme: 'blue', account_num: '' });
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
        if (window.confirm('Delete this wallet? This cannot be undone.')) {
            await deleteWallet.mutateAsync(id);
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
                starting_balance: Number(bankForm.starting_balance)
            });
            setShowBankModal(false);
            setBankForm({ name: '', institution_id: '', account_no: '', iban_no: '', starting_balance: '' });
            toast.success('Bank created successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create bank');
        }
    };

    const handleBankDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Delete this bank account?')) {
            await deleteBank.mutateAsync(id);
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
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight"> {fmtPKR(totalLiquidity)}</p>
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
                        banks.map((bank) => (
                            <Link
                                to={`/banks/${bank.id}`}
                                key={bank.id}
                                className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 p-6 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/50 transition-all group flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {bank.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">{bank.account_no}</p>
                                    </div>
                                    <button
                                        onClick={(e) => handleBankDelete(e, bank.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="mt-auto space-y-4">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">IBAN</p>
                                        <p className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded inline-block">
                                            {bank.iban_no}
                                        </p>
                                    </div>
                                    <div className="flex items-end justify-between pt-4 border-t border-gray-100 dark:border-neutral-800">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Current Balance</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                                    {revealedBankIds.includes(bank.id) ? fmtPKR(bank.current_balance) : '******'}
                                                </p>
                                                <button
                                                    onClick={(e) => toggleBalanceReveal(e, bank.id)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    {revealedBankIds.includes(bank.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            </Link>
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
                    <button
                        onClick={() => setShowWalletModal(true)}
                        className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-sm font-semibold"
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> Add Wallet
                    </button>
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
                                                <button onClick={() => handleUpdateWalletBalance(wallet.id)} className="bg-white text-gray-900 text-xs px-3 py-1.5 rounded font-bold hover:bg-gray-100">Save</button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-white/70 mb-1">Available Balance</p>
                                                <p className="text-3xl font-bold tracking-tight">Rs {fmtPKR(wallet.balance)}</p>
                                            </>
                                        )}
                                    </div>

                                    <div className="relative z-10 flex justify-between items-end">
                                        <p className="tracking-widest opacity-80 font-mono text-sm">
                                            •••• {wallet.account_num ? wallet.account_num.slice(-4) : 'XXXX'}
                                        </p>

                                        {/* Action Buttons (visible on hover) */}
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditWalletId(wallet.id);
                                                    setBalanceInput(wallet.balance.toString());
                                                }}
                                                className="p-1.5 bg-white/20 rounded hover:bg-white/30 backdrop-blur-sm"
                                                title="Update Balance"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleWalletDelete(wallet.id)}
                                                className="p-1.5 bg-red-500/80 rounded hover:bg-red-500 backdrop-blur-sm"
                                                title="Delete Account"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Blank Add Card Slot */}
                    <button
                        onClick={() => setShowWalletModal(true)}
                        className="h-48 rounded-2xl border-2 border-dashed border-gray-300 dark:border-neutral-700 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-all"
                    >
                        <Plus className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">Link New Wallet</span>
                    </button>
                </div>
            </section>

            {/* Create Wallet Modal */}
            {showWalletModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 transition-colors">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Wallet or Cash</h2>
                            <button onClick={() => setShowWalletModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">✕</button>
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

                            <div>
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
                                <Button type="submit" color="blue" disabled={createWallet.isPending || institutions.length === 0} isProcessing={createWallet.isPending}>
                                    Add Wallet
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
                            <button onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">✕</button>
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

                            <div className="pt-4 flex justify-end gap-3">
                                <Button color="light" onClick={() => setShowBankModal(false)}>Cancel</Button>
                                <Button type="submit" color="blue" disabled={createBank.isPending || formatInstitutionOptions('bank').length === 0} isProcessing={createBank.isPending}>
                                    Link Bank
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PIN Verification Modal */}
            {pinModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200 transition-colors">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Security Check</h2>
                            <button onClick={() => setPinModal({ isOpen: false, targetId: null, pin: '', loading: false })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">✕</button>
                        </div>

                        <form onSubmit={handleVerifyPin} className="p-6">
                            <div className="mb-6 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter your Master PIN to reveal this balance.</p>
                                <TextInput
                                    id="pin-entry"
                                    type="password"
                                    required
                                    autoFocus
                                    maxLength={4}
                                    className="w-3/4 mx-auto font-mono text-center tracking-[0.5em]"
                                    sizing="lg"
                                    value={pinModal.pin}
                                    onChange={e => setPinModal({ ...pinModal, pin: e.target.value })}
                                />
                            </div>

                            <Button type="submit" color="blue" disabled={pinModal.loading} isProcessing={pinModal.loading} className="w-full">
                                {pinModal.loading ? 'Verifying...' : 'Unlock Balance'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
