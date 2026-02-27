import { useState, useEffect } from 'react';
import api from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, Activity, FileText, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await api.get('/dashboard/summary');
                setData(response.data);
            } catch (err) {
                console.error('Failed to load dashboard', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return <div className="flex h-full items-center justify-center text-gray-500">Loading dashboard data...</div>;
    if (!data) return <div className="flex h-full items-center justify-center text-red-500">Error loading data.</div>;

    const { metrics, charts } = data;

    const formatCurrency = (val) => 'PKR ' + Number(val).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <div className="text-sm text-gray-500">
                    Last Updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Total Investments" value={metrics.totalInvestments} icon={PieIcon} color="blue" />
                <MetricCard title="Portfolio Value" value={metrics.currentPortfolioValue} icon={TrendingUp} color="emerald" />
                <MetricCard
                    title="Profit / Loss"
                    value={metrics.profitLoss}
                    icon={Activity}
                    color={metrics.profitLoss >= 0 ? "emerald" : "red"}
                />
                <MetricCard title="Total Expenses" value={metrics.totalExpenses} icon={FileText} color="amber" />
                <MetricCard title="Receivable Dues" value={metrics.totalReceivable} icon={ArrowUpCircle} color="emerald" />
                <MetricCard title="Payable Dues" value={metrics.totalPayable} icon={ArrowDownCircle} color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Expenses Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Expenses (Current Year)</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.monthlyExpenses}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(value) => `PKR ${value}`} />
                                <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Investment Distribution Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Investment Distribution</h2>
                    {charts.investmentDistribution.length > 0 ? (
                        <div className="h-80 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={charts.investmentDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {charts.investmentDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 w-full flex items-center justify-center text-gray-400">
                            No investment data to display.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    function MetricCard({ title, value, icon: Icon, color }) {
        const colorClasses = {
            emerald: 'bg-emerald-50 text-emerald-600',
            blue: 'bg-blue-50 text-blue-600',
            red: 'bg-red-50 text-red-600',
            amber: 'bg-amber-50 text-amber-600',
        };

        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                <div className={`p-4 rounded-full ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(value)}</p>
                </div>
            </div>
        );
    }
}
