import { useState } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, Eye, EyeOff } from 'lucide-react';

export default function StatementFileUpload({ fileName, pdfPassword, onPasswordChange, onFileChange, inputId = 'stmt-file-input' }) {
    const [showPassword, setShowPassword] = useState(false);

    const isCsv = fileName?.toLowerCase().endsWith('.csv');
    const isPdf = fileName && !isCsv;

    return (
        <div className="space-y-4">
            {/* Format badges */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Statement File</span>
                <span className="text-red-500 text-sm">*</span>
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] font-medium border border-red-100 dark:border-red-800/40">
                        <FileText className="w-3 h-3" /> PDF
                    </span>
                    <span className="text-gray-300 dark:text-gray-600 text-xs">or</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium border border-emerald-100 dark:border-emerald-800/40">
                        <FileSpreadsheet className="w-3 h-3" /> CSV
                    </span>
                </div>
            </div>

            {/* Drop zone */}
            <div>
                <input
                    type="file"
                    accept=".pdf,.csv"
                    onChange={onFileChange}
                    className="hidden"
                    id={inputId}
                    required
                />
                <label
                    htmlFor={inputId}
                    className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        fileName
                            ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10'
                            : 'border-gray-300 dark:border-neutral-600 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10'
                    }`}
                >
                    <div className="text-center">
                        {fileName ? (
                            <>
                                <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                                    {isCsv
                                        ? <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        : <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    }
                                </div>
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 break-all px-4">{fileName}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click to change file</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-9 h-9 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload or drag and drop</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF or CSV · up to 10MB</p>
                            </>
                        )}
                    </div>
                </label>
            </div>

            {/* CSV hint */}
            {isCsv && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 text-xs text-emerald-700 dark:text-emerald-300">
                    <FileSpreadsheet className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>CSV detected — must have columns: <strong>Date</strong>, <strong>Description</strong>, and <strong>Debit/Credit</strong> or <strong>Amount</strong>. Headers are auto-detected.</span>
                </div>
            )}

            {/* Password field — only for PDF */}
            {!isCsv && (
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        PDF Password <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">(if encrypted)</span>
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter PDF password if required"
                            value={pdfPassword}
                            onChange={(e) => onPasswordChange(e.target.value)}
                            className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Only required if your statement PDF is password protected</p>
                </div>
            )}
        </div>
    );
}
