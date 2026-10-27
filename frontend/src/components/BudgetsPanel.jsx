import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Target, CalendarClock, ShieldCheck, Trash2 } from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';
import { fmtDateLong } from '../utils/dates';
import MaskedBalance from './MaskedBalance';

const CATEGORIES = ['Food & Dining', 'Groceries', 'Utilities', 'Transportation', 'Shopping', 'Entertainment',
    'Education', 'Healthcare', 'Travel', 'Subscription', 'Insurance', 'Bank Charges', 'Bills', 'Other'];

const BAR = { ok: 'bg-emerald-500', warning: 'bg-amber-500', over: 'bg-rose-500' };
const card = 'rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5';
const input = 'rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100';

/** This month's budgets, upcoming bills, emergency runway and savings goals. */
export default function BudgetsPanel() {
    const qc = useQueryClient();
    const overview = useQuery({ queryKey: ['budgets'], queryFn: () => api.get('/budgets').then((r) => r.data) });
    const refresh = () => qc.invalidateQueries({ queryKey: ['budgets'] });
    const onError = (err) => toast.error(err?.response?.data?.message || 'Could not save');

    const saveBudget = useMutation({ mutationFn: (b) => api.put('/budgets', b), onSuccess: refresh, onError });
    const removeBudget = useMutation({ mutationFn: (id) => api.delete(`/budgets/${id}`), onSuccess: refresh, onError });
    const addGoal = useMutation({ mutationFn: (g) => api.post('/budgets/goals', g), onSuccess: refresh, onError });
    const updateGoal = useMutation({ mutationFn: ({ id, ...g }) => api.patch(`/budgets/goals/${id}`, g), onSuccess: refresh, onError });

    const [budgetForm, setBudgetForm] = useState(null);
    const [goalForm, setGoalForm] = useState(null);

    if (overview.isLoading) return <div className="h-40 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />;
    if (overview.isError) return null;
    const o = overview.data;

    return (
        <section aria-labelledby="budgets-title" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Budgets */}
                <div className={`${card} lg:col-span-2`}>
                    <div className="flex items-center justify-between">
                        <h2 id="budgets-title" className="font-semibold text-gray-900 dark:text-gray-100">Budgets this month</h2>
                        <button type="button" onClick={() => setBudgetForm({ category: '', monthly_amount: '', rollover: false })}
                            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                            <Plus className="w-4 h-4" aria-hidden="true" /> Add budget
                        </button>
                    </div>

                    {budgetForm && (
                        <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(e) => {
                            e.preventDefault();
                            saveBudget.mutate({ ...budgetForm, monthly_amount: Number(budgetForm.monthly_amount) }, { onSuccess: () => setBudgetForm(null) });
                        }}>
                            <label className="sr-only" htmlFor="budget-category">Category</label>
                            <input id="budget-category" list="budget-categories" required placeholder="Category" className={input}
                                value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })} />
                            <datalist id="budget-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
                            <label className="sr-only" htmlFor="budget-amount">Monthly amount</label>
                            <input id="budget-amount" type="number" min="1" required placeholder="Monthly amount" className={`${input} w-36`}
                                value={budgetForm.monthly_amount} onChange={(e) => setBudgetForm({ ...budgetForm, monthly_amount: e.target.value })} />
                            <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                                <input type="checkbox" className="accent-emerald-600" checked={budgetForm.rollover}
                                    onChange={(e) => setBudgetForm({ ...budgetForm, rollover: e.target.checked })} />
                                Carry over unspent
                            </label>
                            <button type="submit" className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">Save</button>
                            <button type="button" onClick={() => setBudgetForm(null)} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">Cancel</button>
                        </form>
                    )}

                    {o.budgets.length === 0 && !budgetForm ? (
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Set a monthly limit for a category to see how much is left and get a warning at 80%.</p>
                    ) : (
                        <ul className="mt-4 space-y-3">
                            {o.budgets.map((b) => (
                                <li key={b.id}>
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{b.category}</span>
                                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                            <MaskedBalance value={b.spent} /> <span className="text-gray-400">of</span> <MaskedBalance value={b.available} />
                                            <button type="button" aria-label={`Remove ${b.category} budget`} onClick={() => removeBudget.mutate(b.id)}
                                                className="text-gray-300 hover:text-rose-500 dark:text-neutral-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </span>
                                    </div>
                                    <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden"
                                        role="progressbar" aria-label={`${b.category} budget used`} aria-valuenow={Math.min(b.usedPct ?? 100, 100)} aria-valuemin={0} aria-valuemax={100}>
                                        <div className={`h-full ${BAR[b.status]}`} style={{ width: `${Math.min(b.usedPct ?? 100, 100)}%` }} />
                                    </div>
                                    <p className={`mt-0.5 text-xs ${b.status === 'over' ? 'text-rose-600 dark:text-rose-400' : b.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {b.status === 'over' ? `Over by ${fmtPKR(-b.remaining)}` : `${fmtPKR(b.remaining)} left`}
                                        {b.aheadOfPace && b.status !== 'over' ? ' · spending faster than the month' : ''}
                                        {b.carried ? ` · ${b.carried > 0 ? '+' : ''}${fmtPKR(b.carried)} carried over` : ''}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                    {o.unbudgetedSpend > 0 && o.budgets.length > 0 && (
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Spending in categories without a budget: {fmtPKR(o.unbudgetedSpend)}</p>
                    )}
                </div>

                {/* Runway + upcoming bills */}
                <div className="space-y-4">
                    <div className={card}>
                        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100"><ShieldCheck className="w-4 h-4" aria-hidden="true" /> Emergency runway</h3>
                        {o.runway.months != null ? (
                            <>
                                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{o.runway.months} months</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Cash ÷ your average spending over the last 3 months ({fmtPKR(o.runway.avgMonthlySpend)}/month)</p>
                            </>
                        ) : <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Shows once there is a month of spending.</p>}
                    </div>
                    <div className={card}>
                        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100"><CalendarClock className="w-4 h-4" aria-hidden="true" /> Still due this month</h3>
                        {o.commitments.items.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No recurring bills left this month.</p>
                        ) : (
                            <>
                                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{fmtPKR(o.commitments.total)}</p>
                                <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                                    {o.commitments.items.slice(0, 5).map((c, i) => (
                                        <li key={`${c.name}-${i}`} className="flex justify-between gap-2"><span>{c.name} · {fmtDateLong(c.due)}</span><span>{fmtPKR(c.amount)}</span></li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Goals */}
            <div className={card}>
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100"><Target className="w-4 h-4" aria-hidden="true" /> Savings goals</h3>
                    <button type="button" onClick={() => setGoalForm({ name: '', target_amount: '', target_date: '' })}
                        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                        <Plus className="w-4 h-4" aria-hidden="true" /> Add goal
                    </button>
                </div>
                {goalForm && (
                    <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(e) => {
                        e.preventDefault();
                        addGoal.mutate({ ...goalForm, target_amount: Number(goalForm.target_amount), target_date: goalForm.target_date || null }, { onSuccess: () => setGoalForm(null) });
                    }}>
                        <label className="sr-only" htmlFor="goal-name">Goal</label>
                        <input id="goal-name" required placeholder="e.g. Umrah, emergency fund" className={input} value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} />
                        <label className="sr-only" htmlFor="goal-target">Target amount</label>
                        <input id="goal-target" type="number" min="1" required placeholder="Target" className={`${input} w-32`} value={goalForm.target_amount} onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })} />
                        <label className="sr-only" htmlFor="goal-date">Target date</label>
                        <input id="goal-date" type="date" className={input} value={goalForm.target_date} onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })} />
                        <button type="submit" className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">Save</button>
                        <button type="button" onClick={() => setGoalForm(null)} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">Cancel</button>
                    </form>
                )}
                {o.goals.length === 0 && !goalForm ? (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Save towards something specific and see how much to put aside each month.</p>
                ) : (
                    <ul className="mt-3 grid gap-3 md:grid-cols-2">
                        {o.goals.map((g) => (
                            <li key={g.id} className="rounded-xl border border-gray-100 dark:border-neutral-800 p-3">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{g.name}</span>
                                    <span className="text-gray-500 dark:text-gray-400">{g.progressPct}%</span>
                                </div>
                                <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden" role="progressbar" aria-label={`${g.name} progress`} aria-valuenow={g.progressPct} aria-valuemin={0} aria-valuemax={100}>
                                    <div className={`h-full ${g.done ? 'bg-emerald-600' : 'bg-emerald-400'}`} style={{ width: `${g.progressPct}%` }} />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {fmtPKR(g.saved)} of {fmtPKR(g.target)}
                                    {g.monthlyNeeded != null && !g.done ? ` · ${fmtPKR(g.monthlyNeeded)}/month to reach it by ${fmtDateLong(g.targetDate)}` : ''}
                                </p>
                                <form className="mt-2 flex items-center gap-2" onSubmit={(e) => {
                                    e.preventDefault();
                                    const add = Number(new FormData(e.currentTarget).get('add'));
                                    if (add > 0) updateGoal.mutate({ id: g.id, saved_amount: g.saved + add });
                                    e.currentTarget.reset();
                                }}>
                                    <label className="sr-only" htmlFor={`goal-add-${g.id}`}>Add to {g.name}</label>
                                    <input id={`goal-add-${g.id}`} name="add" type="number" min="1" placeholder="Add saved amount" className={`${input} w-40 text-xs`} />
                                    <button type="submit" className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline">Add</button>
                                </form>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
