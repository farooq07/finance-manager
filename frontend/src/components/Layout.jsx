import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import LegalAcceptGate from './LegalAcceptGate';
import Drawer from './Drawer';

export default function Layout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#F2F4EE] dark:bg-neutral-950 transition-colors overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Header onOpenMenu={() => setMobileMenuOpen(true)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
            <LegalAcceptGate />

            {/* Mobile Navigation Drawer */}
            <Drawer
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                title="Menu"
                width="sm"
            >
                <div className="flex-1 -mx-6 -my-5 h-full">
                   <Sidebar mobile onNavClick={() => setMobileMenuOpen(false)} />
                </div>
            </Drawer>
        </div>
    );
}
