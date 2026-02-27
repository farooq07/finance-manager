import { Link, useLocation } from 'react-router-dom';
import { Home, Receipt, TrendingUp, BarChart2, Users, FileText, Building, Wallet } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Mutual Funds', path: '/mutual-funds', icon: TrendingUp },
    { name: 'Stocks', path: '/stocks', icon: BarChart2 },
    { name: 'Dues Ledger', path: '/dues', icon: Users },
    { name: 'Rent Tracker', path: '/rents', icon: Building },
    { name: 'Reports', path: '/reports', icon: FileText },
];

export default function Sidebar() {
    const location = useLocation();

    return (
        <aside className="w-[64px] bg-white border-r border-gray-200 flex flex-col items-center py-4 hidden md:flex shrink-0">
            {/* Logo mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-sm">
                <Wallet className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={clsx(
                                "sidebar-item w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150",
                                isActive
                                    ? "bg-emerald-50 text-emerald-600 shadow-sm"
                                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            )}
                        >
                            <item.icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2.2 : 1.8} />
                            <span className="sidebar-tooltip">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom indicator */}
            <div className="mt-auto pt-4">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-gray-500">FM</span>
                </div>
            </div>
        </aside>
    );
}
