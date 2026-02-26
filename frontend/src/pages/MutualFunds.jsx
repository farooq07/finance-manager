import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Upload, Plus, ChevronDown, Bell, LogOut, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MutualFunds() {
    const { user } = useAuth();
    const [data, setData] = useState({ funds: [], portfolioSummary: {} });
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');
    const fileInputRef = useRef(null);

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        fund_name: '', fund_symbol: '', units: '', current_nav: '', invested_amount: ''
    });

    const fetchFunds = async () => {
        try {
            const res = await api.get('/mutual-funds');
            // If the backend returns an array (old schema), format it safely
            if (Array.isArray(res.data)) {
                setData({ funds: res.data, portfolioSummary: {} });
            } else {
                setData(res.data || { funds: [], portfolioSummary: {} });
            }
        } catch (error) {
            console.error('Error fetching funds', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFunds();
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadMessage('');

        const form = new FormData();
        form.append('portfolioCSV', file);

        try {
            const res = await api.post('/mutual-funds/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadMessage(res.data.message);
            fetchFunds();
        } catch (error) {
            setUploadMessage('Error uploading CSV.');
            console.error('Upload error', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreateManually = async (e) => {
        e.preventDefault();
        try {
            await api.post('/mutual-funds', formData);
            setShowForm(false);
            setFormData({ fund_name: '', fund_symbol: '', units: '', current_nav: '', invested_amount: '' });
            fetchFunds();
        } catch (error) {
            console.error('Error adding fund', error);
        }
    };

    // Styling configuration reflecting the Meezan screenshot
    const theme = {
        primary: "bg-[#7c2889]", // Meezan Purple
        primaryLight: "bg-[#8b2d9a]",
        textPrimary: "text-[#7c2889]"
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen space-x-2 text-[#7c2889]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="font-medium text-lg">Loading Portfolio...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans -mx-8 -mt-8">



            <main className="flex-1 w-full max-w-4xl mx-auto bg-white min-h-[calc(100vh-60px)] shadow-xl sm:my-6 sm:rounded-2xl overflow-hidden pb-20">

                {/* Welcome & Total Hero Section */}
                <div className="px-6 py-6 bg-white border-b border-gray-100">
                    <p className="text-sm text-gray-400  mb-1">All Portfolios</p>
                    <div className="flex justify-between items-end mb-2">
                        <h2 className="text-xl md:text-2xl font-medium text-gray-800">Total Investment</h2>
                        <div className={`text-2xl md:text-3xl font-semibold ${theme.textPrimary}`}>
                            <span className="text-xs mr-1 font-medium text-gray-500">PKR</span>
                            {data?.portfolioSummary?.totalInvestmentPKR || "0.00"}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-100 px-6 py-2 border-b border-gray-200 flex justify-between text-xs text-gray-500">
                    <span>Details as of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>

                <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100 cursor-pointer hover:bg-gray-50">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Portfolio ID</p>
                        <p className={`font-medium text-sm ${theme.textPrimary}`}>All Portfolios</p>
                    </div>
                    <ChevronDown className={`w-5 h-5 ${theme.textPrimary}`} />
                </div>

                {/* Main Card */}
                <div className="p-4 md:p-6 bg-gray-50/50">
                    <div className="bg-white rounded-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">

                        {/* Inner Total Header */}
                        <div className="bg-gray-50 px-5 py-4 flex justify-between items-center border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Total Investment</span>
                            <div className={`text-lg md:text-xl font-semibold ${theme.textPrimary}`}>
                                <span className="text-xs mr-1 font-medium text-gray-600">PKR</span>
                                {data?.portfolioSummary?.totalInvestmentPKR || "0.00"}
                            </div>
                        </div>

                        {/* Interactive Data Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead>
                                    <tr className={`border-b border-gray-100 ${theme.textPrimary} font-medium`}>
                                        <th className="px-5 py-4 font-medium">Fund</th>
                                        <th className="px-5 py-4 font-medium">Units</th>
                                        <th className="px-5 py-4 font-medium">NAV</th>
                                        <th className="px-5 py-4 font-medium text-right">Value</th>
                                        <th className="px-5 py-4 font-medium text-right bg-purple-50/50">
                                            <div className="flex flex-col items-end">
                                                <span>Gain/loss</span>
                                                <span className="text-[10px] text-gray-500 font-normal">Fiscal Year to Date</span>
                                            </div>
                                        </th>
                                        <th className="px-5 py-4 font-medium text-right">
                                            <div className="flex flex-col items-end">
                                                <span>Gain/loss</span>
                                                <span className="text-[10px] text-gray-500 font-normal">Since Inception</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data?.funds || []).map((fund) => (
                                        <tr key={fund.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className={`${theme.primary} text-white px-3 py-1.5 rounded-md inline-flex items-center text-xs font-medium w-24 justify-between cursor-pointer hover:bg-purple-800 transition-colors`}>
                                                    {fund.fund_symbol}
                                                    <ChevronDown className="w-3 h-3 -rotate-90 opacity-70" />
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600 font-medium">{Number(fund.units).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                            <td className="px-5 py-4 text-gray-600 font-medium">{Number(fund.current_nav).toFixed(4)}</td>
                                            <td className="px-5 py-4 text-right text-gray-600 font-medium">{Number(fund.current_value).toLocaleString()}</td>
                                            <td className="px-5 py-4 text-right text-gray-600 font-medium bg-purple-50/30">
                                                {Number(fund.gain_loss_fytd).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="px-5 py-4 text-right text-gray-600 font-medium">
                                                {Number(fund.gain_loss_since_inception).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {(data?.funds || []).length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-5 py-12 text-center text-gray-400">
                                                No portfolio data available. Please upload a statement.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Management Actions */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-70 transition-all shadow-sm"
                            >
                                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                Upload Statement CSV
                            </button>
                            {uploadMessage && <span className="text-sm text-emerald-600 font-medium">{uploadMessage}</span>}
                        </div>

                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Add Manual Entry
                        </button>
                    </div>

                    {/* Manual Form Toggle */}
                    {showForm && (
                        <form onSubmit={handleCreateManually} className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-in slide-in-from-top-4 fade-in duration-300">
                            <h3 className="font-semibold text-gray-800 mb-4">Manual Portfolio Entry</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Fund Name</label>
                                    <input required placeholder="Meezan Sovereign Fund" type="text" value={formData.fund_name} onChange={e => setFormData({ ...formData, fund_name: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Symbol / Ticker</label>
                                    <input required placeholder="MSF" type="text" value={formData.fund_symbol} onChange={e => setFormData({ ...formData, fund_symbol: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Invested PKR</label>
                                    <input required placeholder="100000" type="number" step="0.01" value={formData.invested_amount} onChange={e => setFormData({ ...formData, invested_amount: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Units</label>
                                    <input required placeholder="1500.55" type="number" step="0.0001" value={formData.units} onChange={e => setFormData({ ...formData, units: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Current NAV</label>
                                    <input required placeholder="55.18" type="number" step="0.0001" value={formData.current_nav} onChange={e => setFormData({ ...formData, current_nav: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                                </div>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button type="submit" className={`px-6 py-2 ${theme.primary} text-white text-sm font-medium rounded-lg hover:bg-purple-800 transition-colors shadow-sm`}>
                                    Save Record
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </main>
        </div>
    );
}
