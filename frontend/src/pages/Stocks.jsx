import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, TrendingUp, RefreshCcw } from 'lucide-react';

export default function Stocks() {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals / Modals State equivalents
    const [showAddStock, setShowAddStock] = useState(false);
    const [showAddTx, setShowAddTx] = useState(null); // stock id

    const [stockForm, setStockForm] = useState({ stock_symbol: '', company_name: '' });
    const [txForm, setTxForm] = useState({ buy_date: new Date().toISOString().split('T')[0], buy_price: '', quantity: '', brokerage_fee: '0' });

    const fetchStocks = async () => {
        try {
            const { data } = await api.get('/stocks');
            setStocks(data);
        } catch (error) {
            console.error('Error fetching stocks', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStocks();
    }, []);

    const handleCreateStock = async (e) => {
        e.preventDefault();
        try {
            await api.post('/stocks', stockForm);
            setShowAddStock(false);
            setStockForm({ stock_symbol: '', company_name: '' });
            fetchStocks();
        } catch (error) {
            alert(error.response?.data?.message || 'Error creating stock');
        }
    };

    const handleAddTx = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/stocks/${showAddTx}/transactions`, {
                ...txForm,
                quantity: parseInt(txForm.quantity)
            });
            setShowAddTx(null);
            setTxForm({ buy_date: new Date().toISOString().split('T')[0], buy_price: '', quantity: '', brokerage_fee: '0' });
            fetchStocks();
        } catch (error) {
            console.error('Error adding transaction', error);
        }
    };

    const updateMarketPrice = async (id, currentPrice) => {
        const newPrice = prompt('Enter latest market price:', currentPrice);
        if (!newPrice) return;
        try {
            await api.put(`/stocks/${id}`, { current_market_price: parseFloat(newPrice) });
            fetchStocks();
        } catch (error) {
            console.error('Error updating price');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove stock and all its transaction history?')) return;
        try {
            await api.delete(`/stocks/${id}`);
            fetchStocks();
        } catch (error) {
            console.error('Error deleting stock', error);
        }
    };

    if (loading) return <div className="p-6">Loading portfolio...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Stock Portfolio</h1>
                <button onClick={() => setShowAddStock(!showAddStock)} className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    <Plus className="w-5 h-5 mr-2" /> Add Stock
                </button>
            </div>

            {showAddStock && (
                <form onSubmit={handleCreateStock} className="bg-white p-6 rounded-xl flex gap-4 items-end shadow-sm border border-gray-100">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Symbol (e.g. OGDC)</label>
                        <input required type="text" value={stockForm.stock_symbol} onChange={e => setStockForm({ ...stockForm, stock_symbol: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded uppercase" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Company Name</label>
                        <input type="text" value={stockForm.company_name} onChange={e => setStockForm({ ...stockForm, company_name: e.target.value })} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded">Track</button>
                </form>
            )}

            {/* Adding Transaction Form inline above the grid if state exists */}
            {showAddTx && (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h3 className="font-semibold text-blue-800 mb-4">Add Transaction for {stocks.find(s => s.id === showAddTx)?.stock_symbol}</h3>
                    <form onSubmit={handleAddTx} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-sm mb-1">Date</label>
                            <input required type="date" value={txForm.buy_date} onChange={e => setTxForm({ ...txForm, buy_date: e.target.value })} className="w-full px-3 py-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Buy Price</label>
                            <input required type="number" step="0.01" value={txForm.buy_price} onChange={e => setTxForm({ ...txForm, buy_price: e.target.value })} className="w-full px-3 py-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Quantity</label>
                            <input required type="number" min="1" value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} className="w-full px-3 py-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Fee</label>
                            <input required type="number" step="0.01" value={txForm.brokerage_fee} onChange={e => setTxForm({ ...txForm, brokerage_fee: e.target.value })} className="w-full px-3 py-2 border rounded" />
                        </div>
                        <div className="flex space-x-2">
                            <button type="button" onClick={() => setShowAddTx(null)} className="px-4 py-2 border rounded bg-white w-full">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded w-full">Save</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {stocks.map(stock => {
                    let totalQty = 0;
                    let totalCost = 0;
                    stock.transactions.forEach(tx => {
                        totalQty += tx.quantity;
                        totalCost += Number(tx.buy_price) * tx.quantity + Number(tx.brokerage_fee);
                    });

                    const currentPrice = Number(stock.current_market_price);
                    const currentVal = totalQty * currentPrice;
                    const profit = currentVal - totalCost;
                    const avgPrice = totalQty > 0 ? (totalCost / totalQty).toFixed(2) : 0;
                    const profitPercent = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(2) : 0;

                    return (
                        <div key={stock.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 border-b px-6 py-4 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{stock.stock_symbol}</h3>
                                    <p className="text-xs text-gray-500">{stock.company_name}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => updateMarketPrice(stock.id, stock.current_market_price)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title="Update Market Price">
                                        <RefreshCcw className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setShowAddTx(stock.id)} className="p-2 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100" title="Buy More">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(stock.id)} className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Quantity</p>
                                    <p className="font-semibold">{totalQty}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Avg Cost</p>
                                    <p className="font-semibold">PKR {avgPrice}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">CMP</p>
                                    <p className="font-semibold text-blue-600">PKR {currentPrice.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Return</p>
                                    <p className={`font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {profit >= 0 ? '+' : ''}PKR {profit.toFixed(2)} ({profitPercent}%)
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
