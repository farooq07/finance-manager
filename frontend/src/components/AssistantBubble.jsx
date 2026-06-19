import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import InlineChart from './InlineChart';

const CHARTABLE_TOOLS = new Set([
  'getIncomeVsExpense', 'getCashFlow', 'getExpenseSummary', 'getTopMerchants', 'getMonthlyExpenses'
]);

const TOOL_LABELS = {
  getExpenseSummary:       '📊 Expense summary',
  getTransactionList:      '🏦 Transactions',
  getIncomeVsExpense:      '📈 Income vs Expenses',
  getBeneficiaryStats:     '🤝 Beneficiary stats',
  getTopMerchants:         '🛒 Top merchants',
  getMonthlyExpenses:      '📅 Monthly expenses',
  getCashFlow:             '💰 Cash flow',
  getAssetSummary:         '📦 Asset summary',
  getMutualFundPerformance:'📈 Mutual funds',
  getStockPortfolio:       '📉 Stock portfolio',
  getDuesList:             '📋 Dues list',
  getWalletSummary:        '👛 Wallet summary',
  getFinancialOverview:    '🧭 Net-worth overview',
  getZakatSummary:         '🕌 Zakat summary',
  getGoldSummary:          '🪙 Gold holdings',
  getDividendSummary:      '💵 Dividends',
  getDebtSummary:          '🧾 Debt',
};

const TOOL_FOLLOWUPS = {
  getExpenseSummary:       ['Show income vs expenses', 'Which merchants do I spend most on?', 'Compare last 3 months'],
  getTransactionList:      ['Summarize spending by category', 'Show top spending merchants', 'Income vs expenses this month'],
  getIncomeVsExpense:      ['Show net cash flow trend', 'Break down this month\'s expenses', 'What is my current balance?'],
  getBeneficiaryStats:     ['Show my dues and receivables', 'Show recent transactions', 'Income vs expenses'],
  getTopMerchants:         ['Show expense breakdown by category', 'Compare income vs expenses', 'Show last month\'s expenses'],
  getMonthlyExpenses:      ['Compare with previous month', 'Show income vs expenses trend', 'Top merchants this month'],
  getCashFlow:             ['Show income vs expenses', 'What is my current balance?', 'Break down this month\'s expenses'],
  getAssetSummary:         ['Show mutual fund performance', 'What is my stock portfolio P&L?', 'Show account balances'],
  getMutualFundPerformance:['Show stock portfolio', 'What are my total assets?', 'Show account balances'],
  getStockPortfolio:       ['Show mutual fund performance', 'What are my total assets?', 'Income vs expenses'],
  getDuesList:             ['Show recent transactions', 'What are my account balances?', 'Beneficiary transfer stats'],
  getWalletSummary:        ['Show income vs expenses', 'What did I spend last month?', 'Show top spending merchants'],
  getFinancialOverview:    ['How much zakat do I owe?', 'Show my stock portfolio', 'What did I spend this month?'],
  getZakatSummary:         ['What is my total net worth?', 'What is my gold worth?', 'Show my account balances'],
  getGoldSummary:          ['How much zakat do I owe?', 'What is my total net worth?', 'Show my assets'],
  getDividendSummary:      ['Show my stock portfolio', 'What is my total net worth?', 'How are my mutual funds performing?'],
  getDebtSummary:          ['What is my total net worth?', 'Show my dues and receivables', 'Show my account balances'],
};

// Columns that contain PKR monetary values
const PKR_KEYS = new Set([
  'total', 'amount', 'avg', 'balance', 'income', 'expenses', 'net', 'value',
  'invested', 'current', 'gain', 'sent', 'received', 'payable', 'receivable',
  'running_total', 'total_sent', 'total_received', 'total_pkr', 'current_value',
  'total_invested', 'total_current', 'total_pnl', 'total_gain', 'pnl', 'cost',
  'avg_cost', 'current_price',
  // Overview / net worth
  'net_worth', 'total_bank', 'total_wallet', 'total_investments', 'mutual_fund_value',
  'stock_value', 'gold_value', 'asset_value', 'rent_balance', 'debt', 'current_month_expenses',
  // Stocks — today's change
  'today_change_value',
  // Zakat
  'zakat_given_this_year', 'zakat_due_estimate', 'given_this_year', 'given_all_time',
  'estimated_due', 'zakatable_net_worth', 'gold_zakat_due',
  // Gold
  'total_value', 'price_per_gram_24k',
  // Dividends
  'gross', 'total_gross', 'total_net', 'net_dividend',
  // Debt
  'total_outstanding', 'outstanding', 'principal', 'minimum_payment',
]);

// ------- Markdown renderer -------

function InlineMarkdown({ text }) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1])      parts.push(<strong key={match.index} className="font-semibold text-gray-900 dark:text-gray-100">{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index} className="italic">{match[4]}</em>);
    else if (match[5]) parts.push(<code key={match.index} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-[11px] font-mono text-primary-600 dark:text-emerald-400">{match[6]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function MarkdownText({ content }) {
  const lines = content.split('\n');
  const elements = [];
  let i = 0, key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bullet list
    if (/^[\*\-•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\*\-•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\*\-•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="space-y-1 my-1.5 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-gray-800 dark:text-gray-200">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary-400 dark:bg-emerald-500 shrink-0" />
              <span><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="space-y-1 my-1.5 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-gray-800 dark:text-gray-200">
              <span className="shrink-0 text-primary-500 dark:text-emerald-400 font-semibold text-xs mt-0.5 w-4">{j + 1}.</span>
              <span><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line → spacing
    if (line.trim() === '') {
      if (elements.length > 0) elements.push(<div key={`sp-${key++}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Heading (#, ##, ###)
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (hm) {
      const lvl = hm[1].length;
      const cls = lvl === 1
        ? 'text-base font-bold text-gray-900 dark:text-gray-100 mt-2 mb-0.5'
        : lvl === 2
          ? 'text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1.5 mb-0.5'
          : 'text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1';
      elements.push(<p key={key++} className={cls}><InlineMarkdown text={hm[2]} /></p>);
      i++;
      continue;
    }

    // Regular line
    elements.push(
      <p key={key++} className="text-gray-800 dark:text-gray-200 leading-relaxed">
        <InlineMarkdown text={line} />
      </p>
    );
    i++;
  }

  return <div className="text-sm space-y-0.5">{elements}</div>;
}

// ------- Sub-components -------

function Avatar() {
  return (
    <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-sm mt-0.5">
      <Sparkles className="w-3.5 h-3.5 text-white" />
    </div>
  );
}

function ToolBadge({ toolName }) {
  const label = TOOL_LABELS[toolName];
  if (!label) return null;
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-50 dark:bg-emerald-900/30 text-primary-600 dark:text-emerald-400 border border-primary-100 dark:border-emerald-800/50 mb-2.5">
      {label}
    </span>
  );
}

function formatCell(key, value) {
  if (value == null) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (typeof value === 'number') {
    const lk = key.toLowerCase();
    if (lk.includes('pct') || lk.includes('percent') || lk === 'pnl_pct' || lk === 'gain_pct') return `${value}%`;
    if (PKR_KEYS.has(lk)) return `PKR ${value.toLocaleString('en-PK')}`;
    return value.toLocaleString('en-PK');
  }
  return String(value);
}

function DataTable({ rows }) {
  if (!rows || rows.length === 0) return null;
  const keys = Object.keys(rows[0]);

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700">
      <table className="w-full text-xs min-w-[360px]">
        <thead>
          <tr className="bg-gray-50 dark:bg-neutral-800/80">
            {keys.map(k => (
              <th key={k} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 capitalize whitespace-nowrap border-b border-gray-200 dark:border-neutral-700">
                {k.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50/80 dark:hover:bg-neutral-800/30 transition-colors">
              {keys.map(k => {
                const isMoney = typeof row[k] === 'number' && PKR_KEYS.has(k.toLowerCase());
                return (
                  <td key={k} className={`px-3 py-2 whitespace-nowrap ${isMoney ? 'font-mono tabular-nums text-gray-800 dark:text-gray-200' : 'text-gray-700 dark:text-gray-300'}`}>
                    {formatCell(k, row[k])}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuggestionChips({ toolName, onSuggest }) {
  const suggestions = TOOL_FOLLOWUPS[toolName];
  if (!suggestions || !onSuggest) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {suggestions.map(s => (
        <button
          key={s}
          onClick={() => onSuggest(s)}
          className="text-xs px-2.5 py-1 rounded-full border border-primary-200 dark:border-emerald-800/60 text-primary-600 dark:text-emerald-400 bg-primary-50/60 dark:bg-emerald-900/20 hover:bg-primary-100 dark:hover:bg-emerald-900/40 hover:border-primary-300 dark:hover:border-emerald-700 transition-all"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ------- Main component -------

export default function AssistantBubble({ content, toolName, toolData, showAvatar = true, showSuggestions = false, onSuggest, timestamp }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tableData = (() => {
    if (!toolData) return null;
    if (Array.isArray(toolData) && toolData.length >= 1) return toolData;
    if (toolData?.categories?.length >= 1) return toolData.categories;
    if (toolData?.funds?.length >= 1)      return toolData.funds;
    if (toolData?.stocks?.length >= 1)     return toolData.stocks;
    if (toolData?.assets?.length >= 1)     return toolData.assets;
    if (toolData?.accounts?.length >= 1)   return toolData.accounts;
    if (toolData?.securities?.length >= 1) return toolData.securities;
    if (toolData?.debts?.length >= 1)      return toolData.debts;
    if (toolData?.items?.length >= 1)      return toolData.items;
    if (toolData?.entries?.length >= 1)    return toolData.entries;
    return null;
  })();

  const showChart = toolName && CHARTABLE_TOOLS.has(toolName);

  return (
    <div className="flex gap-3 group">
      {showAvatar ? <Avatar /> : <div className="w-8 shrink-0" />}

      <div className="flex-1 min-w-0 max-w-[88%]">
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl rounded-tl-md px-4 py-3.5 shadow-sm relative">

          {/* Copy button — appears on hover */}
          <button
            onClick={handleCopy}
            title="Copy response"
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-all"
          >
            {copied
              ? <Check className="w-3.5 h-3.5 text-emerald-500" />
              : <Copy className="w-3.5 h-3.5" />
            }
          </button>

          {toolName && <ToolBadge toolName={toolName} />}

          <MarkdownText content={content} />

          {showChart && <InlineChart toolName={toolName} toolData={toolData} />}
          {!showChart && tableData && <DataTable rows={tableData} />}
        </div>

        {showSuggestions && toolName && (
          <SuggestionChips toolName={toolName} onSuggest={onSuggest} />
        )}

        {timestamp && (
          <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(timestamp).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
