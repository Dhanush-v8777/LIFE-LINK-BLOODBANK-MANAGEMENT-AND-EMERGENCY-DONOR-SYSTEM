import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Search, User, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminDonorsList() {
  const [donors, setDonors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDonors = async () => {
    setError('');
    try {
      const res = await api.get('/admin/donors');
      if (res.data.success) {
        setDonors(res.data.donors);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve blood donors registry list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDonors();
    });
  }, []);

  const filteredDonors = donors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    d.blood_group.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Registered Blood Donors</h3>
          <p className="text-xs text-slate-400 mt-1">Registry of all registered volunteer blood donors</p>
        </div>
        <button 
          onClick={fetchDonors}
          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center space-x-1 hover:bg-slate-50 text-xs"
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
          placeholder="Search by name, email, or blood group..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Donors Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 mt-4 text-xs font-semibold">Loading registry list...</p>
          </div>
        ) : filteredDonors.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No matching registered donors found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Donor Name</th>
                  <th className="px-6 py-3">Blood Type</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Location Address</th>
                  <th className="px-6 py-3">Availability</th>
                  <th className="px-6 py-3">Last Donation Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {filteredDonors.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-600 dark:text-slate-300">
                        {d.name ? d.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-200">{d.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">{d.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-950/40 text-brand-600 dark:text-brand-400 rounded font-black text-[10px]">{d.blood_group}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">{d.phone}</td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{d.address}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        d.availability_status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {d.availability_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString() : 'Never'}
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
