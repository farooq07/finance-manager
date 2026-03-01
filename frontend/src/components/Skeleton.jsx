import React from 'react';
import { clsx } from 'clsx';

/**
 * Base Skeleton block with smooth pulse animation
 */
export function Skeleton({ className, ...props }) {
    return (
        <div
            className={clsx("animate-pulse bg-gray-200 dark:bg-neutral-800 rounded-md transition-colors", className)}
            {...props}
        />
    );
}

/**
 * Skeleton for Dashboard/Report Top Key Metric Stats
 */
export function StatSkeleton() {
    return (
        <div className="bg-white dark:bg-neutral-900 flex-1 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-40" />
        </div>
    );
}

/**
 * Skeleton for Tables (Expenses, Stocks Lists)
 */
export function TableSkeleton({ rows = 5 }) {
    return (
        <div className="bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-gray-200 dark:ring-neutral-800 sm:rounded-lg overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50 flex gap-4 transition-colors">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="divide-y divide-gray-200 dark:divide-neutral-800 transition-colors">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="px-6 py-4 flex gap-4 items-center transition-colors">
                        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Skeleton for Credit Cards (Wallets, Banks)
 */
export function CardSkeleton() {
    return (
        <div className="h-64 rounded-2xl p-6 flex flex-col justify-between shadow-lg bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 relative overflow-hidden transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-neutral-800 dark:to-neutral-900 animate-pulse transition-colors" />

            <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32 !bg-gray-300 dark:!bg-neutral-700" />
                    <Skeleton className="h-4 w-24 !bg-gray-300 dark:!bg-neutral-700" />
                </div>
                <Skeleton className="h-8 w-12 !bg-gray-300 dark:!bg-neutral-700" />
            </div>

            <div className="relative z-10 space-y-2">
                <Skeleton className="h-4 w-16 !bg-gray-300 dark:!bg-neutral-700" />
                <Skeleton className="h-8 w-40 !bg-gray-300 dark:!bg-neutral-700" />
            </div>
        </div>
    );
}

/**
 * Skeleton for Charts (Dashboard)
 */
export function ChartSkeleton() {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6 transition-colors">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
            {/* Chart Area Mock */}
            <div className="h-[300px] w-full flex items-end gap-2 pt-10">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end gap-2 h-full">
                        <Skeleton
                            className="w-full rounded-t-sm"
                            style={{ height: `${Math.max(20, Math.random() * 100)}%` }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
