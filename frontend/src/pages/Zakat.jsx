import { useState } from 'react';
import { useZakatEntries, useCreateZakatEntry, useDeleteZakatEntry, useDashboardSummary } from '../hooks/useZakat';
import { fmtPKR } from '../utils/currency';
import { fmtDateLong } from '../utils/dates';
import Button from '../components/Button';
import MaskedBalance from '../components/MaskedBalance';
import { TableSkeleton, StatSkeleton } from '../components/Skeleton';
import { HeartHandshake, Plus, Trash2, Calculator, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function Zakat() {
    const { data: zakatData, isLoading: loadingZakat } = useZakatEntries();
    const { data: dashboardData, isLoading: loadingDashboard } = useDashboardSummary();

    const createZakat = useCreateZakatEntry();
    const deleteZakat = useDeleteZakatEntry();

    const [form, setForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });

    if (loadingZakat || loadingDashboard) return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Zakat Management</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><StatSkeleton /><StatSkeleton /></div>
            <TableSkeleton rows={3} />
        </div>
    );

    // Calculate Net Worth Balance (minus receivables)
    const totalNetWorth = dashboardData?.metrics?.netWorth || 0;
    const totalReceivable = dashboardData?.metrics?.totalReceivable || 0;
    const applicableZakat = (totalNetWorth - totalReceivable) * 0.025; // 2.5%

    const entries = zakatData?.entries || [];
    const currentYearTotal = zakatData?.currentYearTotal || 0;

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await createZakat.mutateAsync(form);
            setForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
            toast.success('Zakat entry added successfully');
        } catch (error) {
            toast.error('Failed to add Zakat entry');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this Zakat entry?')) {
            try {
                await deleteZakat.mutateAsync(id);
                toast.success('Deleted successfully');
            } catch (error) {
                toast.error('Failed to delete');
            }
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Zakat Management</h1>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6 flex items-start gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                        <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Estimated Zakat (2.5%)</p>
                        <MaskedBalance value={applicableZakat} className="text-3xl font-bold text-gray-900 dark:text-gray-100" />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Based on Net Worth minus Receivables (PKR {fmtPKR(totalNetWorth - totalReceivable)})</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30 p-6 flex items-start gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                        <HeartHandshake className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Zakat Given ({new Date().getFullYear()})</p>
                        <MaskedBalance value={currentYearTotal} className="text-3xl font-bold text-gray-900 dark:text-gray-100" />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Sum of all entries this calendar year</p>
                    </div>
                </div>
            </div>

            {/* Form & Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-neutral-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Record New Zakat Payment</h3>
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1 md:col-span-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    required
                                    value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-1 md:col-span-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount (PKR)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="any"
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                placeholder="0"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    required
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="e.g. Paid to charity organization"
                                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                />
                                <Button
                                    type="submit"
                                    disabled={createZakat.isPending}
                                    className="h-10 px-6 shrink-0 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {createZakat.isPending ? 'Saving...' : <><Plus className="w-4 h-4 mr-1.5" /> Save</>}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {entries.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-neutral-800/30 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold text-xs border-b border-gray-100 dark:border-neutral-800">
                                    <th className="px-6 py-1">Date</th>
                                    <th className="px-6 py-1">Description</th>
                                    <th className="px-6 py-1 text-right">Amount</th>
                                    <th className="px-6 py-1 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                                {entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="px-6 py-1 font-medium text-gray-900 dark:text-gray-100">
                                            {fmtDateLong(entry.date)}
                                        </td>
                                        <td className="px-6 py-1 text-gray-600 dark:text-gray-300">
                                            {entry.description}
                                        </td>
                                        <td className="px-6 py-1 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                            {fmtPKR(entry.amount)}
                                        </td>
                                        <td className="px-6 py-1 text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(entry.id)}
                                                disabled={deleteZakat.isPending}
                                                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                        <HeartHandshake className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>No Zakat records found. Start adding your contributions above.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
