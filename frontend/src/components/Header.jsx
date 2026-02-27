import { useAuth } from '../context/AuthContext';
import { LogOut, Search } from 'lucide-react';

export default function Header({ pageTitle }) {
    const { user, logout } = useAuth();

    return (
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            {/* Left – Page title */}
            <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                {pageTitle}
            </h1>

            {/* Right – Actions */}
            <div className="flex items-center gap-3">
                {/* Search hint */}
                <div className="hidden lg:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-400 cursor-pointer hover:border-gray-300 transition-colors">
                    <Search className="w-3.5 h-3.5" />
                    <span className="text-[13px]">Search...</span>
                    <kbd className="ml-4 text-[11px] font-medium bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-400">⌘K</kbd>
                </div>

                {/* User pill */}
                <div className="flex items-center gap-2 py-1 px-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-default">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white leading-none">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                    </div>
                    <span className="text-[13px] font-medium text-gray-700 hidden sm:block">{user?.name || user?.email}</span>
                </div>

                {/* Logout */}
                <button
                    onClick={logout}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
