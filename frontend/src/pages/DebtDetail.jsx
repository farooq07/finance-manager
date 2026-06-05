import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';
import { fmtDateLong } from '../utils/dates';

export default function DebtDetail() {
    const { id } = useParams();
    const qc = useQueryClient();
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [payForm, setPayForm] = useState({ amount: '', principal_portion: '', interest_portion: '', notes: '' });

    const { data, isLoading, isError } = useQuery({
        queryKey: ['debt', id],
        queryFn: () => api.get(`/debts/${id}`).then((r) => r.data),
    });

    const payMutation = useMutation({
        mutationFn: (payload) => api.post(`/debts/${id}/payments`, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['debt', id] });
            qc.invalidateQueries({ queryKey: ['debts'] });
            toast.success('Payment recorded');
            setPayModalOpen(false);
            setPayForm({ amount: '', principal_portion: '', interest_portion: '', notes: '' });
        },
        onError: () => toast.error('Could not record payment'),
    });

    if (isLoading) return <div className="h-64 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />;
    if (isError || !data) return (
        <div className="p-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
            Could not load this debt.
        </div>
    );

    const { debt, projection } = data;
    const principal = Number(debt.principal);
    const outstanding = Number(debt.outstanding);
    const paid = principal - outstanding;
    const paidPct = principal > 0 ? (paid / principal) * 100 : 0;

    function submitPayment(e) {
        e.preventDefault();
        const payload = { amount: Number(payForm.amount) };
        if (payForm.principal_portion !== '') payload.principal_portion = Number(payForm.principal_portion);
        if (payForm.interest_portion  !== '') payload.interest_portion  = Number(payForm.interest_portion);
        if (payForm.notes) payload.notes = payForm.notes;
        payMutation.mutate(payload);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{debt.name}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                        {debt.debt_type.replace('_', ' ')}
                        {debt.interest_rate ? ` · ${Number(debt.interest_rate).toFixed(2)}% APR` : ''}
                        {debt.minimum_payment ? ` · Min ${fmtPKR(debt.minimum_payment)}/mo` : ''}
                    </p>
                </div>
                <button
                    onClick={() => setPayModalOpen(true)}
                    disabled={!debt.is_active}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Record payment
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stat label="Outstanding"   value={fmtPKR(outstanding)} tone="danger" />
                <Stat label="Repaid"         value={fmtPKR(paid)} sub={`${paidPct.toFixed(1)}% of principal`} tone="positive" />
                <Stat label="Original principal" value={fmtPKR(principal)} tone="neutral" />
            </div>

            <ProjectionPanel projection={projection} debt={debt} />

            <PaymentsList payments={debt.payments} />

            {payModalOpen && (
                <PaymentModal
                    form={payForm}
                    setForm={setPayForm}
                    onSubmit={submitPayment}
                    onClose={() => setPayModalOpen(false)}
                    submitting={payMutation.isPending}
                />
            )}
        </div>
    );
}

function Stat({ label, value, sub, tone }) {
    const toneText = {
        neutral:  'text-gray-900 dark:text-gray-100',
        positive: 'text-emerald-600 dark:text-emerald-400',
        danger:   'text-rose-600 dark:text-rose-400',
    }[tone];
    return (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneText}`}>{value}</p>
            {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
        </div>
    );
}

function ProjectionPanel({ projection, debt }) {
    if (!projection) {
        return (
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Payoff projection</h3>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Add an interest rate and minimum monthly payment on this debt to see a payoff timeline.
                </p>
            </div>
        );
    }
    if (projection.unpayable) {
        return (
            <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Payment doesn't cover interest</h3>
                        <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                            The minimum payment of {fmtPKR(debt.minimum_payment)} is less than the monthly interest charged
                            on {fmtPKR(debt.outstanding)} at {Number(debt.interest_rate).toFixed(2)}% APR. This balance will grow
                            indefinitely. Increase the minimum payment to start reducing principal.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const samples = projection.samples || [];
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#1f2937',
            borderColor: '#374151',
            textStyle: { color: '#f9fafb', fontSize: 12 },
            valueFormatter: (v) => fmtPKR(v),
        },
        grid: { left: '3%', right: '3%', bottom: '10%', top: '8%', containLabel: true },
        xAxis: {
            type: 'category',
            data: samples.map((s) => `M${s.month}`),
            axisLabel: { color: '#9ca3af', fontSize: 10, interval: Math.max(0, Math.floor(samples.length / 8) - 1) },
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v },
            splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
        },
        series: [{
            type: 'line',
            data: samples.map((s) => s.balance),
            smooth: true,
            symbol: 'none',
            itemStyle: { color: '#0a5c3b' },
            lineStyle: { width: 2.5 },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                    { offset: 0, color: 'rgba(10,92,59,0.35)' },
                    { offset: 1, color: 'transparent' },
                ] },
            },
        }],
    };

    return (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Payoff projection</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    At the current minimum, payoff in <strong className="text-gray-900 dark:text-gray-100">{projection.monthsToPayoff} months</strong> · estimated interest paid <strong className="text-gray-900 dark:text-gray-100">{fmtPKR(projection.totalInterest)}</strong>
                </p>
            </div>
            <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />
            <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                Simple amortisation. Assumes constant rate and minimum payment. Capped at 60 months in the chart.
            </p>
        </div>
    );
}

function PaymentsList({ payments }) {
    if (!payments || payments.length === 0) {
        return (
            <div className="p-5 rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/40 text-center text-sm text-gray-500 dark:text-gray-400">
                No payments recorded yet.
            </div>
        );
    }
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-neutral-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent payments</h3>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                {payments.map((p) => (
                    <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                        <div>
                            <p className="text-gray-900 dark:text-gray-100 font-medium tabular-nums">{fmtPKR(p.amount)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDateLong(p.paid_at)}{p.notes ? ` · ${p.notes}` : ''}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                            {p.principal_portion && <p>{fmtPKR(p.principal_portion)} principal</p>}
                            {p.interest_portion  && <p>{fmtPKR(p.interest_portion)} interest</p>}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function PaymentModal({ form, setForm, onSubmit, onClose, submitting }) {
    function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form onSubmit={onSubmit} className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Record payment</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <Field label="Total paid">
                        <input type="number" required min="0" step="0.01" value={form.amount} onChange={(e) => field('amount', e.target.value)} className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Principal portion (optional)">
                            <input type="number" min="0" step="0.01" value={form.principal_portion} onChange={(e) => field('principal_portion', e.target.value)} className={inputCls} placeholder="Defaults to total" />
                        </Field>
                        <Field label="Interest portion (optional)">
                            <input type="number" min="0" step="0.01" value={form.interest_portion} onChange={(e) => field('interest_portion', e.target.value)} className={inputCls} />
                        </Field>
                    </div>
                    <Field label="Notes">
                        <textarea rows="2" value={form.notes} onChange={(e) => field('notes', e.target.value)} className={inputCls} />
                    </Field>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        If you don't split principal and interest, the full amount is treated as principal and reduces the outstanding balance.
                    </p>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900/60 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Cancel</button>
                    <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white text-sm font-medium transition-colors">
                        {submitting ? 'Saving…' : 'Record'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</span>
            {children}
        </label>
    );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500';
