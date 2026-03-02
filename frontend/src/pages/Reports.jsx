import React, { useState } from 'react';
import { FileText, Calendar, PieChart, TrendingUp, ChevronRight } from 'lucide-react';

export default function Reports() {
    const [activeTab, setActiveTab] = useState('daily');

    const menuGroups = [
        {
            title: "Performance Reports",
            items: [
                { id: 'daily', label: 'Daily Report', icon: Calendar },
                { id: 'monthly', label: 'Monthly Report', icon: PieChart },
                { id: 'yearly', label: 'Yearly Report', icon: TrendingUp },
            ]
        }
    ];

    return (
        <div className="flex h-[calc(100vh-3.5rem)] -m-6 text-gray-900 dark:text-gray-100 transition-colors">
            {/* Secondary Sidebar */}
            <div className="w-64 bg-gray-50 dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 flex flex-col pt-6 pb-4 shrink-0 overflow-y-auto hidden md:flex transition-colors">
                <div className="px-6 mb-6">
                    <h1 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">Reports</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase font-semibold tracking-wider">Analytics & Insights</p>
                </div>

                <nav className="flex-1 space-y-6">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h3 className="px-6 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                {group.title}
                            </h3>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center justify-between px-6 py-2.5 text-sm transition-colors ${isActive
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-100'
                                                } ${isActive ? 'border-r-2 border-emerald-600 dark:border-emerald-500' : 'border-r-2 border-transparent'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                                {item.label}
                                            </div>
                                            {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-neutral-900 transition-colors">
                {activeTab === 'daily' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="px-8 py-5 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 shrink-0 transition-colors">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Daily Report</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">View your day-to-day financial activities and transactions.</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-8 bg-gray-50/30 dark:bg-neutral-900/50 flex flex-col items-center justify-center transition-colors">
                            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Daily Report Coming Soon</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-sm">This module is currently under construction. Check back later for detailed daily analytics.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'monthly' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="px-8 py-5 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 shrink-0 transition-colors">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Monthly Report</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Analyze your financial performance month over month.</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-8 bg-gray-50/30 dark:bg-neutral-900/50 flex flex-col items-center justify-center transition-colors">
                            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Monthly Report Coming Soon</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-sm">This module is currently under construction. Check back later for detailed monthly analytics.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'yearly' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="px-8 py-5 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 shrink-0 transition-colors">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Yearly Report</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Comprehensive overview of your annual financial growth.</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-8 bg-gray-50/30 dark:bg-neutral-900/50 flex flex-col items-center justify-center transition-colors">
                            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Yearly Report Coming Soon</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-sm">This module is currently under construction. Check back later for detailed yearly analytics.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
