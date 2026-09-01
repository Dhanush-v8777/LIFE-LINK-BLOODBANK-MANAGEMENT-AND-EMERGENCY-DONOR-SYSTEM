import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { Activity, QrCode, Search, Send, Clock, CheckCircle, XCircle, Loader, Building2, Hospital } from 'lucide-react';

const STATUS_STYLES = {
  Pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  Approved:  'bg-blue-100 text-blue-700 border-blue-200',
  Accepted:  'bg-blue-100 text-blue-700 border-blue-200',
  Rejected:  'bg-red-100 text-red-700 border-red-200',
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Fulfilled: 'bg-green-100 text-green-700 border-green-200',
  Cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_ICONS = {
  Pending:   Clock,
  Approved:  CheckCircle,
  Accepted:  CheckCircle,
  Rejected:  XCircle,
  Completed: CheckCircle,
  Fulfilled: CheckCircle,
  Cancelled: XCircle,
};

export default function PatientDashboard({ triggerRefresh }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Donor requests
  const [donorRequests, setDonorRequests] = useState([]);
  const [donorRequestsLoading, setDonorRequestsLoading] = useState(true);

  // Blood bank requests
  const [bbRequests, setBBRequests] = useState([]);
  const [bbRequestsLoading, setBBRequestsLoading] = useState(true);

  // Hospital requests
  const [hospitalRequests, setHospitalRequests] = useState([]);
  const [hospitalRequestsLoading, setHospitalRequestsLoading] = useState(true);

  // Tracking modal
  const [showTracker, setShowTracker] = useState(false);
  const [trackerData, setTrackerData] = useState(null);
  const [trackerQr, setTrackerQr] = useState('');

  const fetchPatientData = async () => {
    try {
      const res = await api.get('/patients/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Patient dashboard query failed:', err);
      setError('Failed to retrieve patient profile details');
    } finally {
      setLoading(false);
    }
  };

  const fetchDonorRequests = async () => {
    try {
      const res = await api.get('/patients/donor-requests');
      if (res.data.success) {
        setDonorRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Fetch donor requests failed:', err);
    } finally {
      setDonorRequestsLoading(false);
    }
  };

  const fetchBBRequests = async () => {
    try {
      const res = await api.get('/bbr/mine');
      if (res.data.success) {
        setBBRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Fetch blood bank requests failed:', err);
    } finally {
      setBBRequestsLoading(false);
    }
  };

  const fetchHospitalRequests = async () => {
    try {
      const res = await api.get('/hospitals/my-requests');
      if (res.data && res.data.success) {
        setHospitalRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Fetch hospital requests failed:', err);
    } finally {
      setHospitalRequestsLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchPatientData();
      fetchDonorRequests();
      fetchBBRequests();
      fetchHospitalRequests();
    });
  }, [triggerRefresh]);

  const handleTrackRequest = async (requestId, reqObj = null) => {
    setError('');
    if (reqObj) {
      setTrackerData({
        id: reqObj.id,
        blood_group: reqObj.blood_group,
        component: reqObj.units_required ? `${reqObj.units_required} Unit(s)` : 'Whole Blood',
        volume_ml: reqObj.units_required ? reqObj.units_required * 450 : 450,
        status: reqObj.status || 'Pending'
      });
      setTrackerQr('');
      setShowTracker(true);
      return;
    }
    try {
      const res = await api.get(`/requests/${requestId}`);
      if (res.data.success) {
        setTrackerData(res.data.request);
        setTrackerQr(res.data.trackingQr);
        setShowTracker(true);
      }
    } catch {
      setError('Failed to fetch request tracking status');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 mt-4 text-sm font-semibold">Generating patient requests metrics...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded-xl border border-red-200 text-xs font-semibold">
        {error}
      </div>
    );
  }

  const { patient, requests } = data || { patient: {}, requests: [] };
  const highlightedId = location.state?.highlightRequestId;

  return (
    <div className="space-y-6">
      {/* Patient info box */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase">Patient Name</p>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{patient.name}</h3>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase">Blood Group</p>
          <div className="inline-flex items-center space-x-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{patient.blood_group}</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase">Blood Bank Requests</p>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{requests.length + bbRequests.length} Requests</h3>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase">Hospital Requests</p>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{hospitalRequests.length} Sent</h3>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/patient/search-donors')}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition"
        >
          <Search className="h-4 w-4" />
          Find Donors, Blood Banks & Hospitals
        </button>
        <button
          onClick={() => navigate('/patient/request-blood')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl shadow transition"
        >
          <Send className="h-4 w-4" />
          Request Blood Form
        </button>
      </div>

      {/* ─── Hospital Requests Section ─── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-purple-200 dark:border-purple-900/50 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-purple-50/50 dark:bg-purple-950/20">
          <p className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <Hospital className="h-4 w-4 text-purple-600" />
            Hospital Requests
          </p>
          <button
            onClick={() => navigate('/patient/search-donors')}
            className="text-xs font-bold text-purple-600 hover:underline"
          >
            + Request Hospital
          </button>
        </div>

        {hospitalRequestsLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-400">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="text-xs font-semibold">Loading...</span>
          </div>
        ) : hospitalRequests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 mx-auto bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-3">
              <Hospital className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-slate-400 text-xs font-semibold">No hospital blood requests sent yet.</p>
            <button
              onClick={() => navigate('/patient/search-donors')}
              className="mt-3 text-xs font-bold text-purple-600 hover:underline"
            >
              Search hospitals →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Hospital</th>
                  <th className="px-5 py-3">Blood Group</th>
                  <th className="px-5 py-3">Units</th>
                  <th className="px-5 py-3">Required Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {hospitalRequests.map((r) => {
                  const Icon = STATUS_ICONS[r.status] || Clock;
                  const isHighlighted = highlightedId && String(highlightedId) === String(r.id);
                  return (
                    <tr key={r.id} className={`transition-colors ${isHighlighted ? 'bg-purple-50 dark:bg-purple-950/40 border-l-4 border-purple-600' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30'}`}>
                      <td className="px-5 py-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-slate-800 dark:text-slate-100 font-bold">{r.hospital_name}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold text-[10px]">{r.blood_group}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{r.units_required} unit(s)</td>
                      <td className="px-5 py-4 text-slate-500">{new Date(r.required_date).toLocaleDateString()}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status] || STATUS_STYLES.Pending}`}>
                          <Icon className="h-3 w-3" />
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleTrackRequest(r.id, r)}
                          className="text-purple-600 hover:underline cursor-pointer flex items-center space-x-1"
                        >
                          <Activity className="h-4 w-4" />
                          <span>Track</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sent Donor Requests Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Send className="h-3.5 w-3.5 text-red-600" />
            Direct Donor Requests
          </p>
          <button
            onClick={() => navigate('/patient/search-donors')}
            className="text-xs font-bold text-red-600 hover:underline"
          >
            + Send New Request
          </button>
        </div>

        {donorRequestsLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-400">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="text-xs font-semibold">Loading...</span>
          </div>
        ) : donorRequests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
              <Send className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-slate-400 text-xs font-semibold">No direct donor requests sent yet.</p>
            <button
              onClick={() => navigate('/patient/search-donors')}
              className="mt-3 text-xs font-bold text-red-600 hover:underline"
            >
              Search for donors →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Donor</th>
                  <th className="px-5 py-3">Blood Group</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Donation Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {donorRequests.map((r) => {
                  const Icon = STATUS_ICONS[r.request_status] || Clock;
                  const isHighlighted = highlightedId && String(highlightedId) === String(r.id);
                  return (
                    <tr key={r.id} className={`transition-colors ${isHighlighted ? 'bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30'}`}>
                      <td className="px-5 py-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-slate-800 dark:text-slate-100 font-bold">{r.donor_name}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold text-[10px]">{r.blood_group}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.request_status] || STATUS_STYLES.Pending}`}>
                          <Icon className="h-3 w-3" />
                          {r.request_status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {r.donation_date ? new Date(r.donation_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Blood Bank Requests History List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Bank Requests Registry</p>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No blood requests placed yet. Navigate to &quot;Request Blood&quot; to submit your first requisition.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                  <th className="px-6 py-3">Placed Date</th>
                  <th className="px-6 py-3">Required Date</th>
                  <th className="px-6 py-3">Blood Details</th>
                  <th className="px-6 py-3">Urgency</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{new Date(r.required_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-100">
                      {r.volume_ml} ml of {r.blood_group} ({r.component})
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        r.urgency === 'Emergency' ? 'bg-red-100 text-red-700 font-bold' : 'bg-slate-100 text-slate-700'
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
          </div>
        )}
      </div>

      {/* Blood Bank Direct Requests Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            Direct Blood Bank Requests
          </p>
          <button
            onClick={() => navigate('/patient/search-donors')}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            + New Request
          </button>
        </div>

        {bbRequestsLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-400">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="text-xs font-semibold">Loading...</span>
          </div>
        ) : bbRequests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
              <Building2 className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-slate-400 text-xs font-semibold">No blood bank requests yet.</p>
            <button
              onClick={() => navigate('/patient/search-donors')}
              className="mt-3 text-xs font-bold text-blue-600 hover:underline"
            >
              Request from a blood bank →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Blood Bank</th>
                  <th className="px-5 py-3">Blood Group</th>
                  <th className="px-5 py-3">Units</th>
                  <th className="px-5 py-3">Required Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                {bbRequests.map((r) => {
                  const Icon = STATUS_ICONS[r.status] || Clock;
                  const isHighlighted = highlightedId && String(highlightedId) === String(r.id);
                  return (
                    <tr key={r.id} className={`transition-colors ${isHighlighted ? 'bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-600' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30'}`}>
                      <td className="px-5 py-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-slate-800 dark:text-slate-100 font-bold">{r.blood_bank_name}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold text-[10px]">{r.blood_group}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{r.units_required} unit(s)</td>
                      <td className="px-5 py-4 text-slate-500">{new Date(r.required_date).toLocaleDateString()}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status] || STATUS_STYLES.Pending}`}>
                          <Icon className="h-3 w-3" />
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleTrackRequest(r.id, r)}
                          className="text-blue-600 hover:underline cursor-pointer flex items-center space-x-1"
                        >
                          <Activity className="h-4 w-4" />
                          <span>Track</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tracker Modal popup */}
      {showTracker && trackerData && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-sm w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center space-y-4 shadow-2xl animate-fade-in">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center justify-center space-x-2">
              <QrCode className="h-5 w-5 text-brand-600" />
              <span>Realtime Request Tracking</span>
            </h4>

            <div className="flex justify-center py-2">
              {trackerQr ? (
                <img src={trackerQr} alt="Request Tracking QR" className="h-40 w-40 border border-slate-100 p-1 bg-white rounded shadow" />
              ) : (
                <div className="h-40 w-40 bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-xs text-slate-400 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-1">
                    <Activity className="h-8 w-8 text-brand-600 mx-auto animate-pulse" />
                    <p className="font-bold">LIFELINK-REQ-{trackerData.id}</p>
                    <p className="text-[10px] text-slate-400">Request Tracking Active</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl space-y-3 text-xs text-left text-slate-700 dark:text-slate-300">
              <p><strong>Tracking ID:</strong> LIFELINK-REQ-{trackerData.id}</p>
              <p><strong>Blood Group Needed:</strong> {trackerData.blood_group} ({trackerData.component})</p>
              <p><strong>Required Volume/Units:</strong> {trackerData.volume_ml} ml</p>
              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                <strong>Current Status:</strong>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[trackerData.status] || STATUS_STYLES.Pending}`}>
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
