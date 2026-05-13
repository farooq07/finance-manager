import { Sparkles } from 'lucide-react';
import InlineChart from './InlineChart';

const CHARTABLE_TOOLS = new Set([
  'getIncomeVsExpense', 'getCashFlow', 'getExpenseSummary', 'getTopMerchants', 'getMonthlyExpenses'
]);

function Avatar() {
  return (
    <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-sm mt-0.5">
      <Sparkles className="w-3.5 h-3.5 text-white" />
    </div>
  );
}

function ToolBadge({ toolName }) {
  const labels = {
    getExpenseSummary: '📊 Expense summary',
    getTransactionList: '🏦 Transactions',
    getIncomeVsExpense: '📈 Income vs Expenses',
    getBeneficiaryStats: '🤝 Beneficiary stats',
    getTopMerchants: '🛒 Top merchants',
    getMonthlyExpenses: '📅 Monthly expenses',
    getCashFlow: '💰 Cash flow',
    getAssetSummary: '📦 Asset summary',
    getMutualFundPerformance: '📈 Mutual funds',
    getStockPortfolio: '📉 Stock portfolio',
    getDuesList: '📋 Dues list',
    getWalletSummary: '👛 Wallet summary',
  };
  const label = labels[toolName];
  if (!label) return null;
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-50 dark:bg-emerald-900/30 text-primary-600 dark:text-emerald-400 border border-primary-100 dark:border-emerald-800/50 mb-2">
      {label}
    </span>
  );
}

function DataTable({ rows }) {
  if (!rows || rows.length === 0) return null;
  const keys = Object.keys(rows[0]);

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700">
      <table className="w-full text-xs min-w-[360px]">
        <thead>
          <tr className="bg-gray-50 dark:bg-neutral-800">
            {keys.map(k => (
              <th key={k} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 capitalize whitespace-nowrap border-b border-gray-200 dark:border-neutral-700">
                {k.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors">
              {keys.map(k => (
                <td key={k} className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {typeof row[k] === 'number'
                    ? row[k].toLocaleString('en-PK')
                    : row[k] == null ? '—'
                    : row[k] instanceof Date ? new Date(row[k]).toLocaleDateString('en-PK')
                    : String(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AssistantBubble({ content, toolName, toolData, showAvatar = true }) {
  const tableData = (() => {
    if (!toolData) return null;
    if (Array.isArray(toolData) && toolData.length >= 2) return toolData;
    if (toolData?.categories?.length >= 2) return toolData.categories;
    if (toolData?.funds?.length >= 1) return toolData.funds;
    if (toolData?.stocks?.length >= 1) return toolData.stocks;
    if (toolData?.assets?.length >= 1) return toolData.assets;
    if (toolData?.accounts?.length >= 1) return toolData.accounts;
    return null;
  })();

  const showChart = toolName && CHARTABLE_TOOLS.has(toolName);

  return (
    <div className="flex gap-3">
      {showAvatar ? <Avatar /> : <div className="w-8 shrink-0" />}

      <div className="flex-1 min-w-0 max-w-[88%]">
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl rounded-tl-md px-4 py-3.5 shadow-sm">
          {toolName && <ToolBadge toolName={toolName} />}

          {/* Message text — preserve newlines, handle simple markdown */}
          <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>

          {showChart && (
            <InlineChart toolName={toolName} toolData={toolData} />
          )}

          {!showChart && tableData && (
            <DataTable rows={tableData} />
          )}
        </div>
      </div>
    </div>
  );
}
