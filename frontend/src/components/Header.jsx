import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

export default function Header() {
    const { user, logout } = useAuth();

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
            <div className="text-gray-600 font-medium">
                Welcome back, <span className="text-gray-900 font-semibold">{user?.name}</span>
            </div>
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-gray-100 py-1.5 px-3 rounded-full">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{user?.email}</span>
                </div>
                <button
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
