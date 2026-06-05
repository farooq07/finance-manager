import { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Sun, Moon, Sparkles, ArrowLeft, LifeBuoy, ChevronDown } from 'lucide-react';
import { getRouteMeta } from '../utils/routeMeta';

export default function Header() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const meta = getRouteMeta(location.pathname);

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function onClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    function handleLogout() {
        setMenuOpen(false);
        logout();
    }

    function handleHelp() {
        setMenuOpen(false);
        navigate('/help');
    }

    return (
        <header className="h-14 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between px-6 shrink-0 transition-colors">
            {/* Left — breadcrumb + back arrow */}
            <div className="flex items-center gap-2 min-w-0">
                {meta.parent && (
                    <Link
                        to={meta.parent}
                        className="group inline-flex items-center gap-1.5 h-8 px-2 -ml-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                        aria-label={`Back to ${meta.parentTitle}`}
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        <span className="text-[13px] font-medium hidden sm:inline">{meta.parentTitle}</span>
                    </Link>
                )}
                {meta.parent && meta.title && (
                    <span className="text-gray-300 dark:text-neutral-600 text-sm select-none">/</span>
                )}
                {meta.title && (
                    <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight truncate">
                        {meta.title}
                    </h1>
                )}
            </div>

            {/* Right — AI shortcut + user menu */}
            <div className="flex items-center gap-2">
                <Link
                    to="/assistant"
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    title="AI Assistant"
                    aria-label="AI Assistant"
                >
                    <Sparkles className="w-4 h-4" />
                </Link>

                {/* User pill + dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((o) => !o)}
                        className="flex items-center gap-2 py-1 px-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-white leading-none">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                            {user?.name || user?.email}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 hidden sm:block transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-lg py-1.5 z-50">
                            {/* User info */}
                            <div className="px-3.5 py-2 border-b border-gray-100 dark:border-neutral-800 mb-1">
                                <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
                                <p className="text-[11px] text-gray-400 dark:text-neutral-500 truncate">{user?.email}</p>
                            </div>

                            {/* Theme toggle */}
                            <button
                                onClick={() => { toggleTheme(); setMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-3.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                            >
                                {theme === 'dark'
                                    ? <Sun className="w-4 h-4 text-amber-400" />
                                    : <Moon className="w-4 h-4 text-indigo-400" />
                                }
                                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                            </button>

                            {/* Help & Feedback */}
                            <button
                                onClick={handleHelp}
                                className="w-full flex items-center gap-3 px-3.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                            >
                                <LifeBuoy className="w-4 h-4 text-emerald-500" />
                                Help &amp; Feedback
                            </button>

                            <div className="border-t border-gray-100 dark:border-neutral-800 my-1" />

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3.5 py-2 text-[13px] text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
