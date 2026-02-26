import * as React from "react"
import { Menu, X, Bell, User } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"

export interface NavItem {
    title: string;
    href: string;
    icon?: React.ReactNode;
    isActive?: boolean;
}

export interface NavigationLayoutProps {
    navItems: NavItem[];
    userName?: string;
    children: React.ReactNode;
    onNavigate?: (href: string) => void;
    onLogout?: () => void;
}

export function NavigationLayout({
    navItems,
    userName = "User",
    children,
    onNavigate,
    onLogout
}: NavigationLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

    return (
        <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-950 overflow-hidden">

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">FinanceApp</span>
                    <button
                        className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.href}
                            onClick={() => {
                                onNavigate?.(item.href)
                                setIsSidebarOpen(false)
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                item.isActive
                                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                            )}
                        >
                            {item.icon && <span className={cn("shrink-0", item.isActive ? "text-primary-700 dark:text-primary-300" : "text-gray-400 dark:text-gray-500")}>{item.icon}</span>}
                            {item.title}
                        </button>
                    ))}
                </nav>

                {/* Bottom User Area */}
                <div className="border-t border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex flex-col space-y-3">
                        <div className="flex items-center gap-3 px-2">
                            <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{userName}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onLogout} className="justify-start text-gray-500">
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="h-16 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex flex-1 justify-end items-center gap-4">
                        <button className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Bell className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </div>
            </main>

        </div>
    )
}
