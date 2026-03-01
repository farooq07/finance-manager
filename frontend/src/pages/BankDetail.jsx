import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBank } from '../hooks/useBanks';
import { fmtPKR } from '../utils/currency';
import { ArrowLeft, UploadCloud, AlertCircle } from 'lucide-react';
import { Skeleton, TableSkeleton } from '../components/Skeleton';

export default function BankDetail() {
    const { id } = useParams();
    const { data: bank, isLoading } = useBank(id);

    if (isLoading) return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded mb-4" />
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="space-y-2 flex flex-col items-end">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-40" />
                    </div>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-neutral-800/50 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                    <TableSkeleton rows={3} />
                </div>
            </div>
        </div>
    );
    if (!bank) return <div className="p-8 text-red-500 dark:text-red-400">Bank not found.</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <Link to="/accounts" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Accounts
                </Link>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{bank.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-mono mt-1 text-sm">{bank.account_no} • {bank.iban_no}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</p>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{fmtPKR(bank.current_balance)}</h2>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Monthly Statements</h3>
                        <button disabled className="inline-flex items-center gap-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 opacity-50 cursor-not-allowed transition-colors">
                            <UploadCloud className="w-4 h-4" />
                            Upload Statement
                        </button>
                    </div>

                    {bank.statements?.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 border-dashed rounded-xl transition-colors">
                            <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">No statements yet</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                                The monthly statement upload functionality is not active yet. Check back soon.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Render statements here in future */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
