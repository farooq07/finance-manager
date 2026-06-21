import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home, Receipt, TrendingUp, BarChart2, Users, FileText, Building, Wallet,
    Settings, ChevronLeft, ChevronRight, Layers, HeartHandshake, Box, Shield,
    Contact, MessageSquare, CreditCard, Gem, Scale, LifeBuoy,
} from 'lucide-react';
import clsx from 'clsx';
import logosm from '../assets/logosm.svg';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// Lucide icons referenced by name from the menu_visibility table.
const ICONS = {
    Home, Receipt, TrendingUp, BarChart2, Users, FileText, Building, Wallet,
    Settings, Layers, HeartHandshake, Box, Shield, Contact, MessageSquare,
    CreditCard, Gem, Scale, LifeBuoy,
};

// Logical groupings for the sidebar. Sections are rendered in this order;
// any item whose path is not listed below falls into the "More" bucket.
// Order within a section is preserved from menu_visibility.sort_order.
const SECTIONS = [
    {
        id: 'overview',
        label: 'Overview',
        paths: ['/', '/insights', '/net-worth', '/reports'],
    },
    {
        id: 'money',
        label: 'Money',
        paths: ['/accounts', '/banks', '/wallets', '/expenses', '/ledger'],
    },
    {
        id: 'investments',
        label: 'Investments',
        paths: ['/mutual-funds', '/stocks', '/psx-engine'],
    },
    {
        id: 'personal',
        label: 'Personal',
        paths: ['/personal', '/zakat', '/rents', '/assets'],
    },
    {
        id: 'tools',
        label: 'Tools',
        paths: ['/assistant', '/design-system', '/settings', '/help'],
    },
];

function sectionFor(path) {
    for (const s of SECTIONS) {
        if (s.paths.includes(path)) return s.id;
    }
    return 'more';
}

export default function Sidebar({ mobile, onNavClick }) {
    const location = useLocation();
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(true);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const effectiveExpanded = mobile ? true : isExpanded;

    const { data: menuItems = [] } = useQuery({
        queryKey: ['menu-visibility'],
        queryFn: () => api.get('/menu-visibility').then((r) => r.data),
        staleTime: 60_000,
        enabled: !!user,
    });

    // Filter by role, attach icon component.
    const navItems = useMemo(() => menuItems
        // Sub-section rows (parent_path set) gate page tabs, not sidebar entries.
        .filter((item) => !item.parent_path)
        .filter((item) => Array.isArray(item.visible_to_roles) && item.visible_to_roles.includes(user?.role))
        .map((item) => ({
            name: item.name,
            path: item.path,
            icon: ICONS[item.icon] || Home,
            sectionId: sectionFor(item.path),
        })),
    [menuItems, user?.role]);

    // Group items by section, preserving original order within each.
    const grouped = useMemo(() => {
        const sections = SECTIONS.map((s) => ({ ...s, items: [] }));
        const more = { id: 'more', label: 'More', items: [] };
        for (const item of navItems) {
            const target = sections.find((s) => s.id === item.sectionId) || more;
            target.items.push(item);
        }
        return [...sections, more].filter((s) => s.items.length > 0);
    }, [navItems]);

    return (
        <aside
            className={clsx(
                'bg-white dark:bg-neutral-950 flex flex-col shrink-0 relative',
                mobile ? 'w-full h-full border-none' : 'hidden md:flex border-r border-gray-200 dark:border-neutral-800',
                mounted && !mobile ? 'transition-[width] duration-300 ease-in-out' : '',
                !mobile && (effectiveExpanded ? 'w-[232px]' : 'w-[68px]')
            )}
        >
            {/* Logo block */}
            <div className={clsx(
                'h-14 flex items-center gap-2.5 border-b border-gray-100 dark:border-neutral-900 shrink-0',
                effectiveExpanded ? 'px-4' : 'px-0 justify-center'
            )}>
                <img
                    src={logosm}
                    alt="FSWealth Axis"
                    className="h-7 w-7 object-contain shrink-0"
                />
                {effectiveExpanded && (
                    <h1 className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden">
                        FSWealth <span className="text-emerald-500 italic font-semibold">Axis</span>
                    </h1>
                )}
            </div>

            {/* Navigation — scrolls when content overflows the viewport */}
            <nav className="flex-1 min-h-0 overflow-y-auto py-3">
                {grouped.map((section, idx) => (
                    <div key={section.id} className={idx > 0 ? 'mt-4' : ''}>
                        {effectiveExpanded && (
                            <p className="px-4 mb-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase text-gray-400 dark:text-neutral-500">
                                {section.label}
                            </p>
                        )}
                        {!effectiveExpanded && idx > 0 && (
                            <div className="mx-3 my-2 border-t border-gray-100 dark:border-neutral-900" />
                        )}
                        <div className={clsx('flex flex-col', effectiveExpanded ? 'gap-0.5 px-2' : 'gap-1 px-2 items-center')}>
                            {section.items.map((item) => (
                                <NavRow
                                    key={item.path}
                                    item={item}
                                    isExpanded={effectiveExpanded}
                                    location={location}
                                    onClick={onNavClick}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer — collapse toggle (hidden on mobile) */}
            {!mobile && (
                <div className={clsx(
                    'border-t border-gray-100 dark:border-neutral-900 shrink-0 flex items-center',
                    effectiveExpanded ? 'px-3 py-3 justify-between' : 'px-2 py-3 justify-center'
                )}>
                    {effectiveExpanded && (
                        <span className="text-[11px] text-gray-400 dark:text-neutral-500 font-medium tracking-wide">
                            v1
                        </span>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-label={effectiveExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 dark:text-neutral-500 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        {effectiveExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            )}
        </aside>
    );
}

function NavRow({ item, isExpanded, location, onClick }) {
    const Icon = item.icon;
    const isActive = location.pathname === item.path
        || (item.path !== '/' && location.pathname.startsWith(item.path));

    if (!isExpanded) {
        return (
            <Link
                to={item.path}
                onClick={onClick}
                className={clsx(
                    'sidebar-item w-10 h-10 flex items-center justify-center rounded-lg transition-colors relative outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                    isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800/70 hover:text-gray-900 dark:hover:text-gray-100'
                )}
            >
                <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="sidebar-tooltip text-xs">{item.name}</span>
            </Link>
        );
    }

    return (
        <Link
            to={item.path}
            onClick={onClick}
            className={clsx(
                'group relative flex items-center gap-3 h-9 pl-3 pr-3 rounded-lg text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                isActive
                    ? 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100/70 dark:hover:bg-neutral-800/60 hover:text-gray-900 dark:hover:text-gray-100'
            )}
        >
            {/* Left accent bar for active state */}
            <span
                className={clsx(
                    'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full transition-opacity',
                    isActive ? 'bg-emerald-500 opacity-100' : 'opacity-0'
                )}
            />
            <Icon
                className={clsx('w-[18px] h-[18px] shrink-0', isActive ? 'text-emerald-600 dark:text-emerald-400' : '')}
                strokeWidth={isActive ? 2.2 : 1.8}
            />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
        </Link>
    );
}
