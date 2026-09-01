import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function AdminRequestsList() {
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Selection/Detail modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    setError('');
    try {
      const res = await api.get('/admin/requests');
      if (res.data.success) {
        setRequests(res.data.requests);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch blood requests registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchRequests();
    });
  }, []);

  const handleUpdateStatus = async (requestId, status, reason = '') => {
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const res = await api.put(`/requests/${requestId}/status`, { status, reason });
      if (res.data.success) {
        setSuccess(`Request status successfully updated to ${status}.`);
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedRequest(null);
        fetchRequests();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update request status.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    r.blood_group.toLowerCase().includes(search.toLowerCase()) ||
    r.component.toLowerCase().includes(search.toLowerCase()) ||
    r.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Blood Requisitions Logs</h3>
          <p className="text-xs text-slate-400 mt-1">Review, approve, or distribute stock for blood requests</p>
        </div>
        <button 
          onClick={fetchRequests}
          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center space-x-1 hover:bg-slate-50 text-xs"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-xl text-xs font-bold">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold">
          {error}
        </div>
      )}

      {/* Search filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
        <input 
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient, group, component, status..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Requests table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 mt-4 text-xs font-semibold">Loading requisitions list...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No matching requests recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Patient Name</th>
                  <th className="px-6 py-3">Requester Profile</th>
                  <th className="px-6 py-3">Required details</th>
                  <th className="px-6 py-3">Urgency</th>
                  <th className="px-6 py-3">Required Date</th>
                  <th className="px-6 py-3">Fulfillment Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 flex flex-col">
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{r.patient_name}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">ID: #LL-REQ-{r.id}</span>
                    </td>
                    <td className="px-6 py-4 flex flex-col">
                      <span className="text-slate-700 dark:text-slate-300">{r.requester_name}</span>
                      <span className="text-[9px] text-slate-400 font-medium mt-0.5">{r.requester_email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 rounded text-[10px] font-black">{r.blood_group}</span>
                        <span className="text-slate-600 dark:text-slate-400">{r.component} ({r.volume_ml} ml)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        r.urgency === 'Emergency' ? 'bg-red-100 text-red-700 animate-pulse font-bold' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.urgency}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(r.required_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        r.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        r.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'Fulfilled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center space-x-2">
                      {r.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'Approved')}
                            disabled={actionLoading}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                            title="Approve Requisition"
                          >
                            <CheckCircle className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedRequest(r); setShowRejectModal(true); }}
                            disabled={actionLoading}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                            title="Reject Requisition"
                          >
                            <XCircle className="h-4.5 w-4.5" />
                          </button>
                        </>
                      )}
                      {r.status === 'Approved' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'Fulfilled')}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-green-600 text-white rounded text-[10px] font-bold shadow hover:bg-green-700"
                        >
                          Fulfill Dispatch
                        </button>
                      )}
                      {r.status === 'Fulfilled' && (
                        <span className="text-[10px] text-slate-400 font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal dialog */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-sm w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-left space-y-4 shadow-2xl animate-fade-in">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span>Reject Request Requisition</span>
            </h4>
            <div className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              <label className="uppercase text-[10px]">Reason for Rejection</label>
              <textarea
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Mention reasons (e.g. insufficient inventory stock)..."
                rows="3"
                className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex space-x-2 text-xs">
              <button
                onClick={() => { setShowRejectModal(false); setSelectedRequest(null); }}
                className="w-1/2 py-2 border rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedRequest.id, 'Rejected', rejectReason)}
                disabled={actionLoading || !rejectReason}
                className="w-1/2 py-2 bg-red-600 text-white font-bold rounded-xl"
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
