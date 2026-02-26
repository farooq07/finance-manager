import { Link, useLocation } from 'react-router-dom';
import { Home, Receipt, TrendingUp, BarChart2, Users, FileText, Building } from 'lucide-react';
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
        <aside className="w-64 bg-gray-900 text-white flex flex-col hidden md:flex">
            <div className="h-16 flex items-center px-6 border-b border-gray-800">
                <h1 className="text-xl font-bold tracking-wider text-emerald-400">FinanceManager</h1>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={clsx(
                                "flex items-center px-4 py-3 rounded-lg transition-colors group",
                                isActive ? "bg-emerald-500/10 text-emerald-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            )}
                        >
                            <item.icon className={clsx("w-5 h-5 mr-3", isActive ? "text-emerald-400" : "text-gray-400 group-hover:text-white")} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
                &copy; 2026 Personal Finance
            </div>
        </aside>
    );
}
