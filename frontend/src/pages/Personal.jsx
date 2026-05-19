import { useSearchParams } from 'react-router-dom';
import { HeartHandshake, Building, Box } from 'lucide-react';
import Zakat from './Zakat';
import RentTracker from './RentTracker';
import Assets from './Assets';

const TABS = [
    { key: 'zakat',  label: 'Zakat',   icon: HeartHandshake },
    { key: 'rent',   label: 'Rent',    icon: Building },
    { key: 'assets', label: 'Assets',  icon: Box },
];

export default function Personal() {
    const [searchParams, setSearchParams] = useSearchParams();
    const active = searchParams.get('tab') || 'zakat';

    const setTab = (key) => setSearchParams({ tab: key }, { replace: true });

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Personal</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your Zakat, rent income, and physical assets</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800/60 p-1 rounded-xl w-fit">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                            ${active === key
                                ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div>
                {active === 'zakat'  && <Zakat />}
                {active === 'rent'   && <RentTracker />}
                {active === 'assets' && <Assets />}
            </div>
        </div>
    );
}
