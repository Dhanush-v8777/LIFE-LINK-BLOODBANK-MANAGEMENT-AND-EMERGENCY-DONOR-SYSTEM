import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { 
  Users, Building2, Landmark, HeartHandshake, 
  AlertOctagon, ShieldAlert 
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend
);

export default function AdminDashboard({ activeSubTab }) {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setError('');
    try {
      const res = await api.get('/admin/stats');
      if (res.data && res.data.success) {
        setStats(res.data.stats || {});
        setCharts(res.data.charts || {});
        setAuditLogs(res.data.auditLogs || []);
        setError('');
      } else {
        setError(res.data?.message || 'Failed to load system dashboard telemetry details.');
      }
    } catch (err) {
      console.error('Admin dashboard query error:', err);
      setError('Failed to load system dashboard telemetry details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDashboardData();
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 mt-4 text-sm font-semibold">Generating dashboard telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl flex items-center space-x-2 text-sm font-bold">
        <AlertOctagon className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  // Chart configuration structures
  const doughnutData = (charts && Array.isArray(charts.groupDistribution)) ? {
    labels: charts.groupDistribution.map(item => item.blood_group || 'Unknown'),
    datasets: [{
      label: 'Volume (ml)',
      data: charts.groupDistribution.map(item => item.volume || 0),
      backgroundColor: [
        '#ef4444', '#f87171', '#3b82f6', '#60a5fa', 
        '#10b981', '#34d399', '#f59e0b', '#fbbf24'
      ],
      borderWidth: 1
    }]
  } : null;

  const lineData = (charts && Array.isArray(charts.donationTrends)) ? {
    labels: charts.donationTrends.map(item => item.month || 'Month'),
    datasets: [{
      label: 'Blood Donations Collected',
      data: charts.donationTrends.map(item => item.count || 0),
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.1)',
      fill: true,
      tension: 0.3
    }]
  } : null;

  const barData = (charts && Array.isArray(charts.requestTrends)) ? {
    labels: charts.requestTrends.map(item => item.month || 'Month'),
    datasets: [{
      label: 'Patient/Hospital Requests Placed',
      data: charts.requestTrends.map(item => item.count || 0),
      backgroundColor: '#3b82f6',
      borderRadius: 6
    }]
  } : null;

  // If sub tab is logs, show logs exclusively. Else show stats.
  if (activeSubTab === 'logs') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <ShieldAlert className="h-5 w-5 text-brand-600" />
          <span>System Audit Trails</span>
        </h3>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Actor</th>
                <th className="px-6 py-3">Action Description</th>
                <th className="px-6 py-3">IP Address</th>
                <th className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-slate-400 dark:text-slate-500 font-medium">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                    {log.user_email || 'System'}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-500">
                    {log.ip_address}
                  </td>
                  <td className="px-6 py-4 text-slate-500 truncate max-w-xs">
                    {log.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Donors */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Total Donors</p>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats?.donors || 0}</h4>
          </div>
        </div>

        {/* Card 2: Hospitals */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Hospitals Connected</p>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats?.hospitals || 0}</h4>
          </div>
        </div>

        {/* Card 3: Blood Banks */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Blood Banks</p>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats?.bloodBanks || 0}</h4>
          </div>
        </div>

        {/* Card 4: Available Stock */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-xl">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Available Stock</p>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats?.availableStock || 0} ml</h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm md:col-span-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Donation Collections Trend (Monthly)</p>
          <div className="h-64">
            {lineData && <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Stock Blood Group Distribution</p>
          <div className="h-64 flex justify-center items-center">
            {doughnutData && <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Patient Request Trends</p>
          <div className="h-64">
            {barData && <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />}
          </div>
        </div>

        {/* Short audit log preview */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm md:col-span-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Recent Audit Activity Trails</p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 text-xs">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{log.user_email || 'System Action'} ({log.ip_address})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
