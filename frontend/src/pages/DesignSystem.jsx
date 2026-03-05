import React, { useState } from 'react';
import { Palette, Type, CheckSquare, Layers, MessageSquare, Calendar as CalendarIcon, LayoutTemplate, CheckCircle, AlertTriangle, Info, Bell, Plus, Trash2 } from 'lucide-react';
import DatePickerInput from '../components/DatePickerInput';
import Modal from '../components/Modal';
import { toast } from 'sonner';
import LegacyButton from '../components/Button';
import { Button } from '../components/ui/button';
import TextInput from '../components/TextInput';
import Card from '../components/Card';
import Select from '../components/Select';

export default function DesignSystem() {
    const [activeTab, setActiveTab] = useState('colors');
    const [demoDate, setDemoDate] = useState(null);
    const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
    const [modalType, setModalType] = useState('default');

    const triggerToast = (type) => {
        switch (type) {
            case 'success': toast.success('Operation completed successfully!'); break;
            case 'error': toast.error('An unexpected error occurred.'); break;
            case 'loading':
                const id = toast.loading('Processing data...');
                setTimeout(() => toast.success('Done!', { id }), 2000);
                break;
            default: toast('Here is some information.');
        }
    };

    const openModal = (type) => {
        setModalType(type);
        setIsDemoModalOpen(true);
    };

    const menuGroups = [
        {
            title: "Design Tokens",
            items: [
                { id: 'colors', label: 'Color Palette', icon: Palette },
                { id: 'typography', label: 'Typography', icon: Type },
            ]
        },
        {
            title: "Components",
            items: [
                { id: 'buttons', label: 'Buttons & Inputs', icon: CheckSquare },
                { id: 'cards', label: 'Cards & Surfaces', icon: Layers },
                { id: 'overlays', label: 'Modals & Toasts', icon: MessageSquare },
                { id: 'advanced', label: 'Advanced UI', icon: LayoutTemplate },
            ]
        }
    ];

    const colorPalettes = {
        Primary: {
            25: '#F2F8F7', 50: '#E4F1EF', 100: '#C2E0DB', 200: '#9BCDC5', 300: '#71B7AC',
            400: '#52A397', 500: '#388D80', 600: '#1F4842', 700: '#1A3D38', 800: '#14302C', 900: '#102522'
        },
        Gray: {
            25: '#FDFDFD', 50: '#FAFAFA', 100: '#F5F5F5', 200: '#EAEAEB', 300: '#D5D7DA',
            400: '#A4A7AE', 500: '#717680', 600: '#535862', 700: '#414651', 800: '#252B37', 900: '#181D27', 950: '#0A0D12'
        },
        'Gray Dark': {
            25: '#FAFAFA', 50: '#F7F7F7', 100: '#F0F0F1', 200: '#ECECED', 300: '#CECFD2',
            400: '#94979C', 500: '#85888E', 600: '#61656C', 700: '#373A41', 800: '#22262F', 900: '#13161B', 950: '#0C0E12'
        },
        Success: {
            25: '#F6FEF9', 50: '#ECFDF3', 100: '#D1FADF', 200: '#A6F4C5', 300: '#6CE9A6',
            400: '#32D583', 500: '#12B76A', 600: '#039855', 700: '#027A48', 800: '#05603A', 900: '#054F31'
        },
        Error: {
            25: '#FFFBFA', 50: '#FEF3F2', 100: '#FEE4E2', 200: '#FECDCA', 300: '#FDA29B',
            400: '#F97066', 500: '#F04438', 600: '#D92D20', 700: '#B42318', 800: '#912018', 900: '#7A271A'
        },
        Warning: {
            25: '#FFFCF5', 50: '#FFFAEB', 100: '#FEF0C7', 200: '#FEDF89', 300: '#FEC84B',
            400: '#FDB022', 500: '#F79009', 600: '#DC6803', 700: '#B54708', 800: '#93370D', 900: '#7A2E0E'
        },
        Indigo: {
            25: '#F5F6FF', 50: '#EEF4FF', 100: '#E0EAFF', 200: '#C7D7FE', 300: '#A4BCFD',
            400: '#8098F9', 500: '#6172F3', 600: '#444CE7', 700: '#3538CD', 800: '#2D31A6', 900: '#2D3282'
        }
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem)] -m-6 text-gray-900 dark:text-gray-100 transition-colors">
            {/* Sidebar Mapping */}
            <div className="w-64 bg-gray-50 dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 flex flex-col pt-6 pb-4 shrink-0 overflow-y-auto hidden md:flex transition-colors">
                <div className="px-6 mb-6">
                    <h1 className="text-xl font-bold tracking-tight text-primary-600 dark:text-primary-400">Design System</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase font-semibold tracking-wider">UI Kit & Components</p>
                </div>

                <nav className="flex-1 space-y-6">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h3 className="px-6 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                {group.title}
                            </h3>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center justify-between px-6 py-2.5 text-sm transition-colors ${isActive
                                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-100'
                                                } ${isActive ? 'border-r-2 border-primary-600 dark:border-primary-500' : 'border-r-2 border-transparent'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                                {item.label}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-white dark:bg-neutral-950 transition-colors p-8">
                <div className="max-w-5xl mx-auto space-y-12 pb-12">

                    {/* --- COLORS --- */}
                    {activeTab === 'colors' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Color Palette</h2>
                                <p className="text-gray-500 dark:text-gray-400">The foundational color system driving the UI.</p>
                            </div>

                            {Object.entries(colorPalettes).map(([name, shades]) => (
                                <div key={name} className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{name}</h3>
                                    <div className="grid grid-cols-5 md:grid-cols-11 gap-2">
                                        {Object.entries(shades).map(([weight, hex]) => (
                                            <div key={weight} className="flex flex-col gap-1">
                                                <div
                                                    className="w-full h-12 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm"
                                                    style={{ backgroundColor: hex }}
                                                    title={`${name}-${weight}`}
                                                />
                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center font-mono">
                                                    {weight}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- TYPOGRAPHY --- */}
                    {activeTab === 'typography' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Typography Setup</h2>
                                <p className="text-gray-500 dark:text-gray-400">Inter is the primary font family for clean, financial interfaces.</p>
                            </div>

                            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-8 space-y-8">
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Display Large (text-4xl font-bold)</p>
                                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Welcome to WealthAxis</h1>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Display Medium (text-3xl font-bold)</p>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Financial Overview</h2>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Display Small (text-2xl font-bold)</p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio Metrics</h3>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Heading (text-xl font-bold)</p>
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Transactions</h4>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Subheading (text-lg font-semibold)</p>
                                    <h5 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Card Title</h5>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Body Text (text-base text-gray-600)</p>
                                    <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl">
                                        This is standard body text used across descriptions, paragraphs, and general UI readability. It should be legible, neutral, and easy on the eyes when scanning large documents.
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Small Text (text-sm)</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Used for secondary metadata, timestamps, and tiny labels.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- BUTTONS & INPUTS --- */}
                    {activeTab === 'buttons' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Buttons & Inputs</h2>
                                <p className="text-gray-500 dark:text-gray-400">Interactive elements for forms and actions.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-8">
                                    <section className="space-y-4">
                                        <h3 className="text-lg font-semibold border-b dark:border-neutral-800 pb-2">Variants</h3>
                                        <div className="flex flex-wrap gap-4 items-center">
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button variant="default">Default</Button>
                                                <span className="text-[10px] text-gray-500 font-mono">default</span>
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button variant="destructive">Destructive</Button>
                                                <span className="text-[10px] text-gray-500 font-mono">destructive</span>
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button variant="outline">Outline</Button>
                                                <span className="text-[10px] text-gray-500 font-mono">outline</span>
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button variant="secondary">Secondary</Button>
                                                <span className="text-[10px] text-gray-500 font-mono">secondary</span>
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button variant="ghost">Ghost</Button>
                                                <span className="text-[10px] text-gray-500 font-mono">ghost</span>
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button variant="link">Link Variant</Button>
                                                <span className="text-[10px] text-gray-500 font-mono">link</span>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-lg font-semibold border-b dark:border-neutral-800 pb-2">Sizes</h3>
                                        <div className="flex flex-wrap gap-4 items-end">
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button size="sm">Small</Button>
                                                <span className="text-[10px] text-gray-500 font-mono">sm</span>
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button size="default">Default</Button>
                                                <span className="text-[10px] text-gray-500 font-mono">default</span>
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button size="lg">Large</Button>
                                                <span className="text-[10px] text-gray-500 font-mono">lg</span>
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                <Button size="icon"><Plus className="h-4 w-4" /></Button>
                                                <span className="text-[10px] text-gray-500 font-mono">icon</span>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-lg font-semibold border-b dark:border-neutral-800 pb-2">Icon Combinations</h3>
                                        <div className="flex flex-wrap gap-4 items-center">
                                            <Button>
                                                <Plus className="mr-2 h-4 w-4" /> Add Item
                                            </Button>
                                            <Button variant="outline">
                                                <CalendarIcon className="mr-2 h-4 w-4" /> Pick Date
                                            </Button>
                                            <Button variant="secondary" size="sm">
                                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <Bell className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-lg font-semibold border-b dark:border-neutral-800 pb-2">Legacy Controls (Reference)</h3>
                                        <div className="flex flex-wrap gap-4 items-center">
                                            <LegacyButton color="blue">
                                                Legacy Primary
                                            </LegacyButton>
                                            <LegacyButton color="failure">
                                                Legacy Failure
                                            </LegacyButton>
                                        </div>
                                    </section>

                                    <h3 className="text-lg font-semibold border-b dark:border-neutral-800 pb-2 mt-8">Form Controls</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Standard Text Input</label>
                                            <TextInput id="demoinput" type="text" placeholder="e.g. Placeholder..." required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Dropdown</label>
                                            <Select
                                                id="demoselect"
                                                required
                                                options={[
                                                    { label: 'Option 1', value: '1' },
                                                    { label: 'Option 2', value: '2' }
                                                ]}
                                                value="1"
                                                onChange={() => { }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CARDS & SURFACES --- */}
                    {activeTab === 'cards' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Cards & Surfaces</h2>
                                <p className="text-gray-500 dark:text-gray-400">Containers used for organizing content blocks.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Standard Card */}
                                <Card>
                                    <div className="flex flex-col items-start gap-4">
                                        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl">
                                            <Layers className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Standard Card Object</h3>
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">This is the default card style used across the dashboard and lists. It features a subtle shadow and a thin border.</p>
                                        </div>
                                        <button className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">Read more &rarr;</button>
                                    </div>
                                </Card>

                                {/* Metric Card */}
                                <Card className="relative overflow-hidden w-full">
                                    <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                                        <AlertTriangle className="w-32 h-32" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Outstanding</p>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2 tracking-tight">PKR 45,000</h3>
                                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 inline-flex rounded-md w-fit z-10">
                                        &uarr; 12% from last month
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* --- OVERLAYS --- */}
                    {activeTab === 'overlays' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Modals & Toasts</h2>
                                <p className="text-gray-500 dark:text-gray-400">System feedback and interruptive overlays.</p>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold border-b dark:border-neutral-800 pb-2">Toaster Notifications</h3>
                                <div className="flex flex-wrap gap-4">
                                    <Button variant="default" className="bg-emerald-600 dark:bg-emerald-500" onClick={() => triggerToast('success')}>
                                        Trigger Success Toast
                                    </Button>
                                    <Button variant="destructive" onClick={() => triggerToast('error')}>
                                        Trigger Error Toast
                                    </Button>
                                    <Button variant="secondary" onClick={() => triggerToast('loading')}>
                                        Trigger Loading &gt; Success
                                    </Button>
                                </div>

                                <h3 className="text-lg font-semibold border-b dark:border-neutral-800 pb-2 mt-8">Dialog Modals</h3>
                                <div className="flex flex-wrap gap-4">
                                    <Button variant="destructive" onClick={() => openModal('danger')}>
                                        Open Danger Modal (Delete)
                                    </Button>
                                    <Button variant="secondary" onClick={() => openModal('info')}>
                                        Open Info Modal
                                    </Button>
                                </div>
                            </div>

                            {/* Reusable Modal Component Demo */}
                            <Modal
                                isOpen={isDemoModalOpen}
                                onClose={() => setIsDemoModalOpen(false)}
                                title={modalType === 'danger' ? "Delete System File?" : "System Update Available"}
                                description={modalType === 'danger' ? "Are you sure you want to delete this configuration? This action is permanent and cannot be undone." : "A new version of the system has been smoothly installed. You are now running v2.0."}
                                type={modalType}
                                primaryAction={{
                                    label: modalType === 'danger' ? 'Yes, Delete' : 'Great, close',
                                    onClick: () => setIsDemoModalOpen(false),
                                    variant: modalType === 'danger' ? 'danger' : 'primary'
                                }}
                                secondaryAction={{
                                    label: 'Cancel',
                                    onClick: () => setIsDemoModalOpen(false)
                                }}
                            />
                        </div>
                    )}

                    {/* --- ADVANCED UI --- */}
                    {activeTab === 'advanced' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Advanced UI Components</h2>
                                <p className="text-gray-500 dark:text-gray-400">Complex, custom-built components specific to WealthAxis.</p>
                            </div>

                            <div className="max-w-md space-y-6">
                                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4" /> Global DatePicker
                                    </h3>
                                    <div className="space-y-4">
                                        <DatePickerInput
                                            label="Select Transaction Date"
                                            value={demoDate}
                                            onChange={(date) => setDemoDate(date)}
                                        />
                                        <p className="text-xs text-gray-500">
                                            Selected: {demoDate ? demoDate.toISOString() : 'None'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
