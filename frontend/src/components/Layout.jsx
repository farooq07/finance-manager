import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import LegalAcceptGate from './LegalAcceptGate';

export default function Layout() {
    return (
        <div className="flex h-screen bg-[#F2F4EE] dark:bg-neutral-950 transition-colors overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
            <LegalAcceptGate />
        </div>
    );
}
