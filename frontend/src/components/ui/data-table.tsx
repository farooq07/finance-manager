import * as React from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    globalSearch?: boolean;
    onSearchChange?: (term: string) => void;
    title?: string;
    description?: string;
    headerAction?: React.ReactNode;

    // Minimal Pagination
    pagination?: {
        pageSize: number;
        pageIndex: number;
        canPreviousPage: boolean;
        canNextPage: boolean;
        nextPage: () => void;
        previousPage: () => void;
        totalCount: number;
    };
}

export function DataTable<T>({
    data,
    columns,
    globalSearch = false,
    onSearchChange,
    title,
    description,
    headerAction,
    pagination,
}: DataTableProps<T>) {

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs overflow-hidden">

            {/* Header Block */}
            {(title || description || globalSearch || headerAction) && (
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
                        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                        {globalSearch && (
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search..."
                                    className="pl-9 h-9"
                                    onChange={(e) => onSearchChange?.(e.target.value)}
                                />
                            </div>
                        )}
                        {headerAction}
                    </div>
                </div>
            )}

            {/* Table Body */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {data.length > 0 ? (
                            data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                            {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey]) : null)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-500">
                                    No results found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Pagination */}
            {pagination && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                Showing <span className="font-medium">{(pagination.pageIndex * pagination.pageSize) + 1}</span> to{" "}
                                <span className="font-medium">
                                    {Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.totalCount)}
                                </span>{" "}
                                of <span className="font-medium">{pagination.totalCount}</span> results
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={pagination.previousPage}
                                disabled={!pagination.canPreviousPage}
                                leftIcon={<ChevronLeft className="h-4 w-4" />}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={pagination.nextPage}
                                disabled={!pagination.canNextPage}
                                rightIcon={<ChevronRight className="h-4 w-4" />}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
