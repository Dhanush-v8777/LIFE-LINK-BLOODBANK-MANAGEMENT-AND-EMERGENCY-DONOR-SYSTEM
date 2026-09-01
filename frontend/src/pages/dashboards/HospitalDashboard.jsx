import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { 
  Building2, Activity, Layers, CheckCircle, Database, Clock, XCircle, Heart, AlertTriangle, Search, Filter, Phone, Mail, Calendar
} from 'lucide-react';

export default function HospitalDashboard({ activeSubTab, triggerRefresh }) {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tracking
  const [showTracker, setShowTracker] = useState(false);
  const [trackerData, setTrackerData] = useState(null);
  const [trackerQr, setTrackerQr] = useState('');

  // Patient requests
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filters for blood-requests tab
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchHospitalData = async () => {
    try {
      const res = await api.get('/hospitals/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
      const incRes = await api.get('/hospitals/incoming-requests');
      if (incRes.data && incRes.data.success) {
        setIncomingRequests(incRes.data.requests || []);
      }
    } catch (err) {
      console.error('Hospital dashboard telemetry query failed:', err);
      setError('Failed to fetch hospital metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchHospitalData();
    });
  }, [triggerRefresh]);

  const handleStatusUpdate = async (requestId, status, reason = '') => {
    setActionLoadingId(requestId);
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/hospitals/requests/${requestId}/status`, {
        status,
        rejectionReason: reason
      });
      if (res.data.success) {
        setSuccess(`Request #${requestId} has been ${status.toLowerCase()}`);
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedReq(null);
        fetchHospitalData();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update request status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTrackRequest = async (requestId) => {
    setError('');
    try {
      const res = await api.get(`/requests/${requestId}`);
      if (res.data.success) {
        setTrackerData(res.data.request);
        setTrackerQr(res.data.trackingQr);
        setShowTracker(true);
      }
    } catch {
      setError('Failed to load tracking status');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 mt-4 text-sm font-semibold">Generating hospital dashboard metrics...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900 text-xs font-semibold">
        {error || 'No hospital profile found. Please contact the administrator.'}
      </div>
    );
  }

  const { hospital, stats, requests, regionalStock } = data || { hospital: {}, stats: {}, requests: [], regionalStock: [] };
  const highlightedId = location.state?.highlightRequestId;

  // Render Sub Tab: Regional Stocks Check
  if (activeSubTab === 'stock-check') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Database className="h-5 w-5 text-brand-600" />
          <span>Regional Blood Banks Stock Directory</span>
        </h3>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {regionalStock.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              No available inventory registered in the regional networks at this time.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                  <th className="px-6 py-3">Blood Bank Name</th>
                  <th className="px-6 py-3">Blood Group</th>
                  <th className="px-6 py-3">Component Type</th>
                  <th className="px-6 py-3">Available Stock Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {regionalStock.map((stock, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-bold">{stock.blood_bank_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-[10px]">
                        {stock.blood_group}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{stock.component}</td>
                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{stock.total_volume} ml</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // Filter incoming requests for blood-requests tab
  const filteredIncomingRequests = incomingRequests.filter(r => {
    const matchesSearch = (r.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.blood_group || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.contact_number || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Render Sub Tab: Dedicated Patient Blood Requests View
  if (activeSubTab === 'blood-requests') {
    return (
      <div className="space-y-6">
        {/* Banners */}
        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Heart className="h-5 w-5 text-purple-600" />
              <span>Incoming Patient Blood Requests</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review and manage blood requests submitted directly to {hospital.name} by patients.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, group..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {['All', 'Pending', 'Approved', 'Rejected', 'Fulfilled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    statusFilter === st ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-purple-200 dark:border-purple-900/50 overflow-hidden shadow-sm">
          {filteredIncomingRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-semibold">
              <Heart className="h-10 w-10 text-purple-300 mx-auto mb-3" />
              <p>No patient blood requests found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                    <th className="px-6 py-3">Date Placed</th>
                    <th className="px-6 py-3">Patient Details</th>
                    <th className="px-6 py-3">Blood Group</th>
                    <th className="px-6 py-3">Units</th>
                    <th className="px-6 py-3">Required Date</th>
                    <th className="px-6 py-3">Emergency Notes</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                  {filteredIncomingRequests.map((r) => {
                    const isHighlighted = highlightedId && String(highlightedId) === String(r.id);
                    return (
                      <tr key={r.id} className={`transition-colors ${isHighlighted ? 'bg-purple-50 dark:bg-purple-950/40 border-l-4 border-purple-600' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30'}`}>
                        <td className="px-6 py-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <p className="text-slate-800 dark:text-slate-100 font-bold">{r.patient_name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {r.contact_number}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg font-bold text-xs">{r.blood_group}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-bold">{r.units_required} unit(s)</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(r.required_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {r.emergency_notes || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            r.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'Fulfilled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {r.status === 'Pending' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStatusUpdate(r.id, 'Approved')}
                                disabled={actionLoadingId === r.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle className="h-3 w-3" /> Approve
                              </button>
                              <button
                                onClick={() => { setSelectedReq(r); setShowRejectModal(true); }}
                                disabled={actionLoadingId === r.id}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                              >
                                <XCircle className="h-3 w-3" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-medium">{r.status}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && selectedReq && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 max-w-sm w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4 shadow-2xl animate-fade-in">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span>Reject Request #{selectedReq.id}</span>
              </h4>
              <p className="text-xs text-slate-500">Provide reason for rejection (sent to patient):</p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Stock unavailable, contact blood bank..."
                rows={3}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedReq.id, 'Rejected', rejectionReason)}
                  className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-xl"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default Hospital Dashboard view
  return (
    <div className="space-y-6">
      {/* Alert banners */}
      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Hospital details panel */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-2xl border border-slate-700/60 shadow flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-black">Connected Institution</span>
          <h3 className="text-lg font-black text-slate-100 mt-0.5">{hospital.name}</h3>
          <p className="text-[10px] text-slate-400 mt-1">License: {hospital.license_number} &bull; Contact: {hospital.contact_person}</p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <Building2 className="h-8 w-8 text-brand-500" />
        </div>
      </div>

      {/* Grid: Request status counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Placed</p>
            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.totalRequests}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Pending</p>
            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.pendingRequests}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Approved</p>
            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.approvedRequests}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Fulfilled</p>
            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.fulfilledRequests}</h4>
          </div>
        </div>
      </div>

      {/* ─── Incoming Patient Blood Requests ─── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-purple-200 dark:border-purple-900/50 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-purple-50/50 dark:bg-purple-950/20">
          <p className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <Heart className="h-4 w-4 text-purple-600" />
            Patient Blood Requests Sent to Hospital
          </p>
        </div>

        {incomingRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No patient blood requests submitted to this hospital yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Patient Name</th>
                  <th className="px-6 py-3">Blood Group</th>
                  <th className="px-6 py-3">Units</th>
                  <th className="px-6 py-3">Required Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {incomingRequests.map((r) => {
                  const isHighlighted = highlightedId && String(highlightedId) === String(r.id);
                  return (
                    <tr key={r.id} className={`transition-colors ${isHighlighted ? 'bg-purple-50 dark:bg-purple-950/40 border-l-4 border-purple-600' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30'}`}>
                      <td className="px-6 py-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-100 font-bold">{r.patient_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold text-[10px]">{r.blood_group}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{r.units_required} unit(s)</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(r.required_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          r.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                          r.status === 'Fulfilled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {r.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStatusUpdate(r.id, 'Approved')}
                              disabled={actionLoadingId === r.id}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                            >
                              <CheckCircle className="h-3 w-3" /> Approve
                            </button>
                            <button
                              onClick={() => { setSelectedReq(r); setShowRejectModal(true); }}
                              disabled={actionLoadingId === r.id}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                            >
                              <XCircle className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">{r.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Requests table (Placed by hospital) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Institution Requests Logs</p>
        </div>
        
        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No blood requests registered yet. Click &quot;Place Blood Request&quot; to draft one.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                <th className="px-6 py-3">Placed Date</th>
                <th className="px-6 py-3">Patient Name</th>
                <th className="px-6 py-3">Blood details</th>
                <th className="px-6 py-3">Urgency</th>
                <th className="px-6 py-3">Fulfillment Status</th>
                <th className="px-6 py-3">Tracking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-bold">{r.patient_name}</td>
                  <td className="px-6 py-4 text-slate-800 dark:text-slate-100">{r.volume_ml} ml of {r.blood_group} ({r.component})</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      r.urgency === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {r.urgency}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      r.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      r.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'Fulfilled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleTrackRequest(r.id)}
                      className="text-brand-600 hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <Activity className="h-4 w-4" />
                      <span>Track</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-sm w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4 shadow-2xl animate-fade-in">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span>Reject Request #{selectedReq.id}</span>
            </h4>
            <p className="text-xs text-slate-500">Provide reason for rejection (sent to patient):</p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Stock unavailable, contact blood bank..."
              rows={3}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedReq.id, 'Rejected', rejectionReason)}
                className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-xl"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracker Modal popup */}
      {showTracker && trackerData && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-sm w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center space-y-4 shadow-2xl animate-fade-in">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center justify-center space-x-2">
              <Activity className="h-5 w-5 text-brand-600" />
              <span>Realtime Request Tracking</span>
            </h4>
            
            <div className="flex justify-center py-2">
              {trackerQr ? (
                <img src={trackerQr} alt="Request Tracking QR" className="h-40 w-40 border border-slate-100 p-1 bg-white rounded shadow" />
              ) : (
                <div className="h-40 w-40 bg-slate-100 flex items-center justify-center text-xs text-slate-400">Loading QR...</div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl space-y-3 text-xs text-left text-slate-700 dark:text-slate-300">
              <p><strong>Tracking ID:</strong> LIFELINK-REQ-{trackerData.id}</p>
              <p><strong>Blood Group Needed:</strong> {trackerData.blood_group} ({trackerData.component})</p>
              <p><strong>Required Volume:</strong> {trackerData.volume_ml} ml</p>
              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                <strong>Current Status:</strong>
                <span className={`px-2 py-0.5 rounded text-[10px] ${
                  trackerData.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                  trackerData.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                  trackerData.status === 'Fulfilled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {trackerData.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowTracker(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition"
            >
              Close Tracker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
