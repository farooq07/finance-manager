import { useState } from 'react';
import { useAssets, useCreateAsset, useDeleteAsset } from '../hooks/useAssets';
import { fmtPKR } from '../utils/currency';
import { fmtDateLong } from '../utils/dates';
import Button from '../components/Button';
import MaskedBalance from '../components/MaskedBalance';
import { TableSkeleton, StatSkeleton } from '../components/Skeleton';
import { Car, Home, Camera, Gem, Plus, Trash2, Box, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const ASSET_TYPES = ['Real Estate', 'Vehicle', 'Gold/Jewelry', 'Electronics', 'Other'];

const getIconForType = (type) => {
    switch (type) {
        case 'Real Estate': return Home;
        case 'Vehicle': return Car;
        case 'Gold/Jewelry': return Gem;
        case 'Electronics': return Camera;
        default: return Box;
    }
};

export default function Assets() {
    const { data: assetData, isLoading } = useAssets();
    const createAsset = useCreateAsset();
    const deleteAsset = useDeleteAsset();

    const [form, setForm] = useState({ name: '', type: 'Real Estate', value: '', description: '', purchase_date: '' });

    if (isLoading) return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Physical Assets</h1>
            <StatSkeleton />
            <TableSkeleton rows={5} />
        </div>
    );

    const assets = assetData?.assets || [];
    const totalValue = assetData?.totalValue || 0;

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await createAsset.mutateAsync(form);
            setForm({ name: '', type: 'Real Estate', value: '', description: '', purchase_date: '' });
            toast.success('Asset added successfully');
        } catch (error) {
            toast.error('Failed to add asset');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you confirm you want to remove this asset?')) {
            try {
                await deleteAsset.mutateAsync(id);
                toast.success('Asset removed');
            } catch (error) {
                toast.error('Failed to delete asset');
            }
        }
    };

    return (
        <div className="space-y-6 max-w-6xl">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Physical Assets</h1>

            {/* Total Value Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 p-6 flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full">
                        <Box className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Assets Value</p>
                        <MaskedBalance value={totalValue} className="text-3xl font-bold text-gray-900 dark:text-gray-100" />
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Add New Asset</h3>
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Asset Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Corolla 2024"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</label>
                        <select
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                        >
                            {ASSET_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1 md:col-span-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Est. Value (PKR)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            placeholder="0"
                            value={form.value}
                            onChange={(e) => setForm({ ...form, value: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date (Optional)</label>
                        <input
                            type="date"
                            value={form.purchase_date}
                            onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                        <Button
                            type="submit"
                            disabled={createAsset.isPending}
                            className="w-full h-10 px-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            {createAsset.isPending ? 'Saving...' : <><Plus className="w-4 h-4 mr-1.5" /> Save</>}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Asset List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset) => {
                    const Icon = getIconForType(asset.type);
                    return (
                        <div key={asset.id} className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6 flex flex-col group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="p-3 bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 rounded-xl">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(asset.id)}
                                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="relative z-10 flex-1">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{asset.name}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{asset.type}</p>

                                <div className="mt-auto">
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Estimated Value</p>
                                    <MaskedBalance value={asset.value} className="text-2xl font-bold text-indigo-600 dark:text-indigo-400" />
                                    {asset.purchase_date && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            Added {fmtDateLong(asset.purchase_date)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {/* Decorative background icon */}
                            <Icon className="absolute -right-6 -bottom-6 w-32 h-32 text-gray-50 dark:text-neutral-800 opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    );
                })}

                {assets.length === 0 && (
                    <div className="col-span-full p-12 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl">
                        <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No assets recorded yet. Add your property, vehicles, or gold above.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
