import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Receipt, TrendingUp, BarChart2, Users, FileText, Building, Wallet, Settings, ChevronLeft, ChevronRight, Layers, HeartHandshake, Box, Shield, Contact, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import logo from '../assets/logo.svg';
import logosm from '../assets/logosm.svg';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// Map of icon names (from DB) → lucide components
const ICONS = {
    Home, Receipt, TrendingUp, BarChart2, Users, FileText, Building, Wallet,
    Settings, Layers, HeartHandshake, Box, Shield, Contact, MessageSquare
};

const adminNavItems = [
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Roles', path: '/roles', icon: Shield },
];

export default function Sidebar() {
    const location = useLocation();
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(true);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Fetch menu visibility config from the backend
    const { data: menuItems = [] } = useQuery({
        queryKey: ['menu-visibility'],
        queryFn: () => api.get('/menu-visibility').then(r => r.data),
        staleTime: 60_000,
        enabled: !!user,
    });

    const isAdmin = ['admin', 'super.admin'].includes(user?.role);

    // Filter items: admins see everything; regular users only see visible_to_user items
    const baseNavItems = menuItems
        .filter(item => isAdmin || item.visible_to_user)
        .map(item => ({
            name: item.name,
            path: item.path,
            icon: ICONS[item.icon] || Home,
        }));

    return (
        <aside className={clsx(
            "bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 flex flex-col items-center py-4 hidden md:flex shrink-0 relative",
            mounted ? "transition-all duration-300 ease-in-out" : "",
            isExpanded ? "w-[220px] items-start px-2" : "w-[64px] items-center"
        )}>
            {/* Expand Toggle */}


            {/* Logo mark */}
            <div className={clsx("flex items-center mb-2 h-9 ", isExpanded ? "w-full justify-start px-2" : "justify-center")}>
                <img
                    src={isExpanded ? logo : logosm}
                    alt="WealthAxis"
                    className={clsx("object-contain transition-all duration-300", isExpanded ? "h-8" : "h-7 w-7")}
                />
                {isExpanded && (
                    <h1 className="text-lg font-bold ml-2 text-gray-900 dark:text-white transition-opacity duration-300">
                        FSWealth <span className="text-emerald-500">Axis</span>
                    </h1>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-1 w-full px-2 mt-2">
                {(() => {
                    const allItems = baseNavItems.concat(isAdmin ? adminNavItems : []);
                    return allItems.map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={clsx(
                                    "sidebar-item flex items-center rounded-lg transition-all duration-150 relative group outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                                    isExpanded ? "w-full px-3 py-2.5" : "w-10 h-10 justify-center",
                                    isActive
                                        ? "bg-emerald-50 text-emerald-600 shadow-sm dark:bg-emerald-900/20 dark:text-emerald-400"
                                        : "text-gray-800 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-gray-100"
                                )}
                            >
                                <item.icon className={clsx("w-[20px] h-[20px] shrink-0", isExpanded && "mr-3")} strokeWidth={isActive ? 2.2 : 1.8} />

                                {isExpanded && (
                                    <span className={clsx("font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300", mounted ? "opacity-100" : "opacity-0")}>
                                        {item.name}
                                    </span>
                                )}

                                {!isExpanded && <span className="sidebar-tooltip text-xs">{item.name}</span>}
                            </Link>
                        );
                    });
                })()}
            </nav>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-white dark:bg-neutral-800 border rounded-sm border-gray-200 dark:border-neutral-700 text-gray-400 dark:text-gray-500 size-8 hover:text-emerald-500 transition-colors z-10"
            >
                {isExpanded ? <ChevronLeft /> : <ChevronRight />}
            </Button>


        </aside>
    );
}
