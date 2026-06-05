import { useState, useRef } from 'react';
import {
    LifeBuoy, Bug, Lightbulb, HelpCircle, MessageCircle,
    Upload, X, CheckCircle, Clock, AlertCircle, ChevronDown,
    Send, Image, Loader2, ShieldAlert,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TYPE_CONFIG = {
    bug:      { label: 'Bug Report',       icon: Bug,          color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',    ring: 'ring-red-400' },
    feature:  { label: 'Feature Request',  icon: Lightbulb,    color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20', ring: 'ring-amber-400' },
    question: { label: 'Question',         icon: HelpCircle,   color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',   ring: 'ring-blue-400' },
    other:    { label: 'Other',            icon: MessageCircle,color: 'text-gray-500',   bg: 'bg-gray-100 dark:bg-neutral-800',  ring: 'ring-gray-400' },
};

const STATUS_CONFIG = {
    open:        { label: 'Open',        icon: AlertCircle,  cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
    in_progress: { label: 'In Progress', icon: Clock,        cls: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
    resolved:    { label: 'Resolved',    icon: CheckCircle,  cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' },
};

const FAQS = [
    { q: 'How do I add a new bank account?', a: 'Go to Accounts → click "Add Account" → choose Bank, fill in the details and save.' },
    { q: 'How do I record a transaction?', a: 'Open any account or wallet page, then click "Add Transaction" in the top-right corner.' },
    { q: 'Can I export my data?', a: 'Yes — go to Settings and use the Export section to download a CSV of your data.' },
    { q: 'How does gold tracking work?', a: 'Visit Personal → Gold tab. Add your gold items with weight and purity; live rates update automatically.' },
    { q: 'What is the Ledger?', a: 'The Ledger tracks money you owe others (loans) and money owed to you (dues) in one place.' },
];

function FaqItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800/60 transition-colors"
            >
                {q}
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 ml-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-neutral-800 pt-3">
                    {a}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
}

function AdminPanel() {
    const { data: items = [], isLoading } = useQuery({
        queryKey: ['feedback-all'],
        queryFn: () => api.get('/feedback').then((r) => r.data),
    });
    const qc = useQueryClient();

    const updateStatus = useMutation({
        mutationFn: ({ id, status }) => api.patch(`/feedback/${id}/status`, { status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback-all'] }),
    });

    if (isLoading) return (
        <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading submissions…
        </div>
    );

    if (!items.length) return (
        <div className="text-center py-16 text-gray-400 dark:text-neutral-500 text-sm">No submissions yet.</div>
    );

    return (
        <div className="space-y-3">
            {items.map((item) => {
                const tc = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
                const TypeIcon = tc.icon;
                return (
                    <div key={item.id} className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <span className={`mt-0.5 p-1.5 rounded-lg ${tc.bg}`}>
                                <TypeIcon className={`w-4 h-4 ${tc.color}`} />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
                                    <StatusBadge status={item.status} />
                                </div>
                                <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
                                    {item.user?.name} · {new Date(item.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <select
                                value={item.status}
                                onChange={(e) => updateStatus.mutate({ id: item.id, status: e.target.value })}
                                className="text-xs border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shrink-0"
                            >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 pl-10 whitespace-pre-wrap">{item.description}</p>
                        {item.screenshot && (
                            <div className="pl-10">
                                <img
                                    src={item.screenshot}
                                    alt="screenshot"
                                    className="max-h-64 rounded-lg border border-gray-200 dark:border-neutral-700 object-contain cursor-pointer"
                                    onClick={() => window.open(item.screenshot, '_blank')}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function Help() {
    const { user } = useAuth();
    const isAdmin = ['admin', 'super.admin'].includes(user?.role);
    const [activeTab, setActiveTab] = useState('submit');

    const [form, setForm] = useState({ type: 'bug', title: '', description: '' });
    const [screenshot, setScreenshot] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const fileRef = useRef(null);
    const qc = useQueryClient();

    const { data: myItems = [] } = useQuery({
        queryKey: ['feedback-mine'],
        queryFn: () => api.get('/feedback/mine').then((r) => r.data),
        enabled: activeTab === 'mine',
    });

    const submit = useMutation({
        mutationFn: (payload) => api.post('/feedback', payload),
        onSuccess: () => {
            toast.success('Feedback submitted — thank you!');
            setForm({ type: 'bug', title: '', description: '' });
            setScreenshot(null);
            setScreenshotPreview(null);
            qc.invalidateQueries({ queryKey: ['feedback-mine'] });
        },
        onError: (err) => toast.error(err?.response?.data?.error || 'Could not submit feedback'),
    });

    function handleFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Screenshot must be under 2 MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setScreenshot(ev.target.result);
            setScreenshotPreview(ev.target.result);
        };
        reader.readAsDataURL(file);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }
        submit.mutate({ ...form, screenshot });
    }

    const tabs = [
        { id: 'submit', label: 'Submit Feedback' },
        { id: 'faq',    label: 'FAQ' },
        { id: 'mine',   label: 'My Reports' },
        ...(isAdmin ? [{ id: 'admin', label: 'All Submissions' }] : []),
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                    <LifeBuoy className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Help &amp; Feedback</h1>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">Report bugs, request features, or ask questions</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-neutral-900 rounded-xl w-fit">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === t.id
                                ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 shadow-sm'
                                : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Submit Feedback */}
            {activeTab === 'submit' && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-6 space-y-5">
                    {/* Type selector */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Type</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                                const Icon = cfg.icon;
                                const active = form.type === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setForm((f) => ({ ...f, type: key }))}
                                        className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all text-xs font-medium ${
                                            active
                                                ? `${cfg.bg} border-current ${cfg.color}`
                                                : 'border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 hover:border-gray-300 dark:hover:border-neutral-600'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 ${active ? cfg.color : ''}`} />
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            maxLength={200}
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Short summary of the issue or request"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 dark:focus:border-emerald-500 transition"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                            Description <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            rows={5}
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Describe the issue in detail — steps to reproduce, what you expected, what happened instead…"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 dark:focus:border-emerald-500 transition resize-none"
                        />
                    </div>

                    {/* Screenshot */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                            Screenshot <span className="text-gray-400 font-normal normal-case">(optional, max 2 MB)</span>
                        </label>
                        {screenshotPreview ? (
                            <div className="relative inline-block">
                                <img
                                    src={screenshotPreview}
                                    alt="preview"
                                    className="max-h-48 rounded-xl border border-gray-200 dark:border-neutral-700 object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={() => { setScreenshot(null); setScreenshotPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-neutral-700 text-gray-400 dark:text-neutral-500 hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors text-sm w-full justify-center"
                            >
                                <Image className="w-4 h-4" />
                                Click to attach a screenshot
                            </button>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                    </div>

                    <button
                        type="submit"
                        disabled={submit.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-medium text-sm transition-colors"
                    >
                        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {submit.isPending ? 'Submitting…' : 'Submit Feedback'}
                    </button>
                </form>
            )}

            {/* FAQ */}
            {activeTab === 'faq' && (
                <div className="space-y-2">
                    {FAQS.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
                </div>
            )}

            {/* My Reports */}
            {activeTab === 'mine' && (
                <div className="space-y-3">
                    {myItems.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 dark:text-neutral-500 text-sm">
                            You haven't submitted any feedback yet.
                        </div>
                    ) : myItems.map((item) => {
                        const tc = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
                        const TypeIcon = tc.icon;
                        return (
                            <div key={item.id} className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl px-4 py-3 flex items-center gap-3">
                                <span className={`p-1.5 rounded-lg shrink-0 ${tc.bg}`}>
                                    <TypeIcon className={`w-4 h-4 ${tc.color}`} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
                                    <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
                                        {new Date(item.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <StatusBadge status={item.status} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Admin — all submissions */}
            {activeTab === 'admin' && isAdmin && (
                <div>
                    <div className="flex items-center gap-2 mb-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-2.5">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        Admin view — all user submissions with status management
                    </div>
                    <AdminPanel />
                </div>
            )}
        </div>
    );
}
