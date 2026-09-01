import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Search, Building2, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminHospitalsList() {
  const [hospitals, setHospitals] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHospitals = async () => {
    setError('');
    try {
      const res = await api.get('/admin/hospitals');
      if (res.data.success) {
        setHospitals(res.data.hospitals);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve registered hospitals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchHospitals();
    });
  }, []);

  const filteredHospitals = hospitals.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.license_number.toLowerCase().includes(search.toLowerCase()) ||
    h.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Connected Hospitals Directory</h3>
          <p className="text-xs text-slate-400 mt-1">Directory of all hospitals authorized to request blood units</p>
        </div>
        <button 
          onClick={fetchHospitals}
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
          placeholder="Search by hospital name, contact, license..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Hospitals Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 mt-4 text-xs font-semibold">Loading directory list...</p>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No matching hospitals registered.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Hospital Name</th>
                  <th className="px-6 py-3">License Number</th>
                  <th className="px-6 py-3">Contact Person</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Location Address</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {filteredHospitals.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <Building2 className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-200">{h.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">{h.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">{h.license_number}</td>
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-200">{h.contact_person}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{h.phone}</td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{h.address}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        h.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {h.is_verified ? 'Verified' : 'Pending Verification'}
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
