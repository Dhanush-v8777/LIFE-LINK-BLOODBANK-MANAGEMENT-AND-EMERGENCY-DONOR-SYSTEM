import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminInventoryList() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInventory = async () => {
    setError('');
    try {
      const res = await api.get('/admin/inventory');
      if (res.data.success) {
        setInventory(res.data.inventory);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve blood inventory list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchInventory();
    });
  }, []);

  const filteredInventory = inventory.filter(item => 
    item.blood_bank_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.blood_group.toLowerCase().includes(search.toLowerCase()) ||
    item.component.toLowerCase().includes(search.toLowerCase()) ||
    item.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Overall Blood Inventory Stock</h3>
          <p className="text-xs text-slate-400 mt-1">Real-time inventory levels across all connected regional blood banks</p>
        </div>
        <button 
          onClick={fetchInventory}
          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center space-x-1 hover:bg-slate-50 text-xs font-semibold shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
        <input 
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by blood bank, group, component, or status..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 mt-4 text-xs font-semibold">Loading inventory...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No matching inventory units found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Unit ID</th>
                  <th className="px-6 py-3">Blood Bank</th>
                  <th className="px-6 py-3">Blood Group</th>
                  <th className="px-6 py-3">Component</th>
                  <th className="px-6 py-3">Volume per Unit</th>
                  <th className="px-6 py-3">Units</th>
                  <th className="px-6 py-3">Expiry Date</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-slate-400 font-mono">#LL-UNIT-{item.id}</td>
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-bold">{item.blood_bank_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-950/40 text-brand-600 dark:text-brand-400 rounded font-black text-[10px]">
                        {item.blood_group}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{item.component}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-mono">{item.volume_ml} ml</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-mono font-bold">{item.units}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(item.expiry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'Available' ? 'bg-green-100 text-green-700' :
                        item.status === 'Reserved' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
