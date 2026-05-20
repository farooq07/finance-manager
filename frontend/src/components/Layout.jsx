import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import LegalAcceptGate from './LegalAcceptGate';

const pageTitles = {
    '/': 'Dashboard',
    '/expenses': 'Expenses',
    '/mutual-funds': 'Mutual Funds',
    '/stocks': 'Stocks',
    '/dues': 'Dues Ledger',
    '/rents': 'Rent Tracker',
    '/reports': 'Reports',
};

export default function Layout() {
    const location = useLocation();
    const pageTitle = pageTitles[location.pathname] || 'WealthAxis';

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-neutral-950 transition-colors overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Header pageTitle={pageTitle} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
            <LegalAcceptGate />
        </div>
    );
}
