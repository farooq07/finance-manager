import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Sun, Moon, Sparkles } from 'lucide-react';

export default function Header({ pageTitle }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="h-14 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between px-6 shrink-0 transition-colors">
            {/* Left – Page title */}
            <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
                {pageTitle}
            </h1>

            {/* Right – Actions */}
            <div className="flex items-center gap-2">
                {/* AI Assistant */}
                <Link
                    to="/assistant"
                    className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                    title="AI Assistant"
                    aria-label="AI Assistant"
                >
                    <Sparkles className="w-4 h-4" />
                </Link>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* User pill */}
                <div className="flex items-center gap-2 py-1 px-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-default">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white leading-none">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                    </div>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 hidden sm:block">{user?.name || user?.email}</span>
                </div>

                {/* Logout */}
                <button
                    onClick={logout}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
