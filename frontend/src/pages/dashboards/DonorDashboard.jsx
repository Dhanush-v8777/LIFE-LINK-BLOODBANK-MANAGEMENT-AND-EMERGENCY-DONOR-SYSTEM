import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Heart, CheckCircle, ShieldCheck,
  AlertTriangle, MapPin, Award, History,
  Bell, XCircle, Clock, CheckCheck, Droplets,
  User, Phone, Calendar, Info, Edit3, Save, Download,
  Search, Filter, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import AddressAutocomplete from '../../components/AddressAutocomplete';

const REQUEST_STATUS_STYLES = {
  Pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  Accepted:  'bg-blue-100 text-blue-700 border-blue-200',
  Rejected:  'bg-red-100 text-red-700 border-red-200',
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function DonorDashboard({ activeSubTab }) {
  const location = useLocation();
  const { updateProfile: authUpdateProfile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state for QR ticket
  const [showTicket, setShowTicket] = useState(false);
  const [qrTicket, setQrTicket] = useState('');
  const [ticketDetails, setTicketDetails] = useState(null);

  // Blood requests tab state
  const [bloodRequests, setBloodRequests] = useState([]);
  const [bloodRequestsLoading, setBloodRequestsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  // Profile Edit Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    dob: '',
    gender: 'Male',
    phone: '',
    address: '',
    medicalInfo: '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileUpdating, setProfileUpdating] = useState(false);

  const [certificates, setCertificates] = useState([]);
  const [certsLoading, setCertsLoading] = useState(true);

  // History Tab State
  const [historyData, setHistoryData] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('All');
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/donors/history?page=${historyPage}&limit=${historyLimit}&search=${encodeURIComponent(historySearch)}&status=${historyStatus}`);
      if (res.data && res.data.success) {
        setHistoryData(res.data.data || []);
        setHistoryTotal(res.data.pagination?.total || 0);
      } else {
        setHistoryData([]);
        setHistoryTotal(0);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setHistoryData([]);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCertificates = async () => {
    setCertsLoading(true);
    try {
      const res = await api.get('/donors/certificates');
      if (res.data && res.data.success) {
        setCertificates(res.data.certificates || []);
      } else {
        setCertificates([]);
      }
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
      setCertificates([]);
    } finally {
      setCertsLoading(false);
    }
  };

  const fetchDonorData = async () => {
    try {
      const res = await api.get('/donors/dashboard');
      if (res.data && res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Donor dashboard data fetch failed:', err);
      setError('Failed to fetch donor dashboard details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBloodRequests = async () => {
    setBloodRequestsLoading(true);
    try {
      const res = await api.get('/donors/blood-requests');
      if (res.data && res.data.success) {
        setBloodRequests(res.data.requests || []);
      } else {
        setBloodRequests([]);
      }
    } catch (err) {
      console.error('Failed to fetch blood requests:', err);
      setBloodRequests([]);
    } finally {
      setBloodRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchHistory();
    }
  }, [activeSubTab, historyPage, historySearch, historyStatus]);

  useEffect(() => {
    if (activeSubTab === 'blood-requests') {
      fetchBloodRequests();
    } else if (activeSubTab === 'certificates') {
      fetchCertificates();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (data && data.donor) {
      setProfileForm({
        name: data.donor.name || '',
        dob: data.donor.dob ? new Date(data.donor.dob).toISOString().split('T')[0] : '',
        gender: data.donor.gender || 'Male',
        phone: data.donor.phone || '',
        address: data.donor.address || '',
        medicalInfo: data.donor.medical_info || '',
      });
    }
  }, [data]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      const res = await api.put('/donors/availability', { status: newStatus });
      if (res.data.success) {
        setSuccess('Availability status updated successfully');
        setData(prev => ({
          ...prev,
          donor: { ...prev.donor, availability_status: newStatus }
        }));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleAcceptEmergency = async (requestId, patientName, bloodGroup, volume) => {
    setError('');
    try {
      const res = await api.post('/requests/accept-emergency', { requestId });
      if (res.data.success) {
        setQrTicket(res.data.qrTicket);
        setTicketDetails({ patientName, bloodGroup, volume, date: new Date().toLocaleDateString() });
        setShowTicket(true);
        fetchDonorData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept request');
    }
  };

  const handleRespondToRequest = async (requestId, action) => {
    setRespondingId(requestId);
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/donors/blood-requests/${requestId}/respond`, { action });
      if (res.data.success) {
        setSuccess(`Request ${action === 'Accept' ? 'accepted' : 'rejected'} successfully`);
        fetchBloodRequests();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to respond to request');
      setTimeout(() => setError(''), 5000);
    } finally {
      setRespondingId(null);
    }
  };

  const handleCompleteDonation = async (requestId) => {
    setCompletingId(requestId);
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/donors/blood-requests/${requestId}/complete`);
      if (res.data.success) {
        setSuccess(`Donation completed! Cooldown active. Next eligible: ${new Date(res.data.nextEligibleDate).toLocaleDateString()}`);
        fetchBloodRequests();
        fetchDonorData(); // Refresh eligibility
        setTimeout(() => setSuccess(''), 8000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete donation');
      setTimeout(() => setError(''), 5000);
    } finally {
      setCompletingId(null);
    }
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileUpdating(true);
    setError('');
    setSuccess('');
    try {
      const res = await authUpdateProfile(profileForm);
      if (res.success) {
        setSuccess('Profile updated successfully!');
        setIsEditingProfile(false);
        fetchDonorData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      setError('Profile update request failed');
    } finally {
      setProfileUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 mt-4 text-sm font-semibold">Loading donor dashboard details...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-sm font-semibold">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { donor, donations = [], eligibility = {}, matchingEmergencyRequests = [], incomingRequests = [] } = data;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=LIFELINK-DONOR-${donor.id}-${donor.name}-${donor.blood_group}`;


  // ───── HISTORY TAB ─────
  if (activeSubTab === 'history') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <History className="h-5 w-5 text-brand-600" />
          <span>My Donation History</span>
        </h3>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={historyStatus}
                onChange={e => { setHistoryStatus(e.target.value); setHistoryPage(1); }}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {['All', 'Completed', 'Accepted', 'Rejected', 'Pending'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            {/* Search */}
            <div className="flex items-center flex-1 min-w-[200px] gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search patient or hospital..."
                value={historySearch}
                onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                className="flex-1 text-xs bg-transparent text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {historyLoading ? (
            <div className="p-8 text-center text-slate-500">Loading history...</div>
          ) : historyData.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No donation history available.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3">Donation Date</th>
                      <th className="px-6 py-3">Recipient</th>
                      <th className="px-6 py-3">Blood Group</th>
                      <th className="px-6 py-3">Units</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                    {historyData.map((d) => (
                      <tr key={`${d.source_type}-${d.source_id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                        <td className="px-6 py-4 text-slate-500">{new Date(d.donation_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-slate-800 dark:text-slate-200">
                          <div>
                            <span>{d.recipient_name}</span>
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 uppercase">{d.source_type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-black">{d.blood_group}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {d.units_donated} unit(s)
                          <div className="text-[10px] text-slate-400">{d.volume_ml} ml</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            d.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                            d.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{d.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          {d.certificate_id && (
                            <button
                              onClick={() => {
                                const token = localStorage.getItem('token');
                                window.open(`http://localhost:5000/api/donors/certificates/download/${d.certificate_id}?token=${token}`, '_blank');
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 rounded text-[10px] font-bold transition flex items-center gap-1.5"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">
                  Showing {(historyPage - 1) * historyLimit + 1} to {Math.min(historyPage * historyLimit, historyTotal)} of {historyTotal} entries
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage(p => p - 1)}
                    className="p-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={historyPage * historyLimit >= historyTotal}
                    onClick={() => setHistoryPage(p => p + 1)}
                    className="p-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ───── CERTIFICATES TAB ─────
  if (activeSubTab === 'certificates') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Award className="h-5 w-5 text-brand-600" />
          <span>Donation Certificates</span>
        </h3>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {certsLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : certificates.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No donation certificates available.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {certificates.map((cert) => (
                <div key={cert.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded flex items-center justify-center">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Certificate</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{cert.certificate_id}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Date: {new Date(cert.donation_date).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Patient: {cert.patient_name || 'LifeLink Blood Bank'}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('token');
                        window.open(`http://localhost:5000/api/donors/certificates/${cert.id}/pdf?token=${token}`, '_blank');
                      }}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('token');
                        window.open(`http://localhost:5000/api/donors/certificates/${cert.id}/pdf?token=${token}&download=true`, '_blank');
                      }}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───── BLOOD REQUESTS TAB ─────
  if (activeSubTab === 'blood-requests') {
    return (
      <div className="space-y-6">
        {success && (
          <div className="bg-green-100 text-green-800 px-4 py-3 rounded-xl border border-green-200 text-sm font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="bg-red-100 text-red-800 px-4 py-3 rounded-xl border border-red-200 text-sm font-semibold flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {!eligibility.isEligible && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300">Donation Cooldown Active (Ends {new Date(eligibility.nextEligibleDate).toLocaleDateString()})</h4>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{eligibility.reason}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Bell className="h-5 w-5 text-brand-600" />
            <span>Direct Patient Blood Requests</span>
          </h3>
          <button
            onClick={fetchBloodRequests}
            className="text-xs font-bold text-brand-600 hover:underline"
          >
            Refresh List
          </button>
        </div>

        {bloodRequestsLoading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bloodRequests.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
            <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold text-sm">No patient requests received yet</p>
            <p className="text-slate-400 text-xs mt-1">When patients request you as a donor directly, it will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bloodRequests.map((req) => (
              <div
                key={req.id}
                className={`bg-white dark:bg-slate-800 border rounded-2xl p-5 shadow-sm transition-all ${
                  req.request_status === 'Pending'
                    ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10'
                    : req.request_status === 'Accepted'
                    ? 'border-blue-200 dark:border-blue-900/40'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${REQUEST_STATUS_STYLES[req.request_status] || REQUEST_STATUS_STYLES.Pending}`}>
                        {req.request_status}
                      </span>
                      <span className="h-6 w-6 bg-red-600 text-white text-[10px] font-black rounded flex items-center justify-center">
                        {req.blood_group}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Request from patient</p>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{req.patient_name}</h4>
                    </div>

                    {req.patient_message && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{req.patient_message}"</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    {req.request_status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleRespondToRequest(req.id, 'Accept')}
                          disabled={!eligibility.isEligible || respondingId === req.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition shadow-sm animate-fade-in"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespondToRequest(req.id, 'Reject')}
                          disabled={respondingId === req.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-red-100 dark:bg-slate-700 dark:hover:bg-red-900/30 text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 text-xs font-bold rounded-lg transition"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {req.request_status === 'Accepted' && (
                      <button
                        onClick={() => handleCompleteDonation(req.id)}
                        disabled={completingId === req.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                      >
                        Donation Complete
                      </button>
                    )}

                    {(req.request_status === 'Completed' || req.request_status === 'Rejected') && (
                      <span className="text-xs text-slate-400 font-medium italic self-center">
                        {req.request_status === 'Completed' ? '✓ Completed' : '✗ Declined'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ───── PROFILE TAB ─────
  if (activeSubTab === 'profile') {
    return (
      <div className="space-y-6">
        {success && (
          <div className="bg-green-100 text-green-800 px-4 py-3 rounded-xl border border-green-200 text-sm font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="bg-red-100 text-red-800 px-4 py-3 rounded-xl border border-red-200 text-sm font-semibold flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <User className="h-5 w-5 text-brand-600" />
            <span>Donor Account Profile</span>
          </h3>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-300/50 transition"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit Profile
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileInputChange}
                  disabled={!isEditingProfile}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-75 transition-all"
                />
              </div>

              {/* Email (Read Only always) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Email Address (Account Identifier)
                </label>
                <input
                  type="email"
                  readOnly
                  value={donor.email}
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-500 select-all"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> Contact Phone
                </label>
                <input
                  type="text"
                  required
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileInputChange}
                  disabled={!isEditingProfile}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-75 transition-all"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Date of Birth
                </label>
                <input
                  type="date"
                  required
                  name="dob"
                  value={profileForm.dob}
                  onChange={handleProfileInputChange}
                  disabled={!isEditingProfile}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-75 transition-all"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                <select
                  name="gender"
                  value={profileForm.gender}
                  onChange={handleProfileInputChange}
                  disabled={!isEditingProfile}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-75 transition-all font-bold"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Blood Group (Fixed display) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Blood Group</label>
                <div className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-400 font-extrabold flex items-center space-x-2">
                  <span className="h-5 w-5 bg-red-600 text-white rounded text-[10px] flex items-center justify-center">{donor.blood_group}</span>
                  <span>Contact support to modify registered blood group.</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Full Address Location
              </label>
              <AddressAutocomplete
                required
                name="address"
                value={profileForm.address}
                onChange={(val) => setProfileForm(prev => ({ ...prev, address: val }))}
                disabled={!isEditingProfile}
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-75 transition-all"
              />
            </div>

            {/* Medical Info */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> Medical Information / Health History
              </label>
              <textarea
                name="medicalInfo"
                value={profileForm.medicalInfo}
                onChange={handleProfileInputChange}
                disabled={!isEditingProfile}
                rows="3"
                placeholder="Declare active medical issues, allergies, or regular medications..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-75 transition-all"
              />
            </div>

            {/* Submit / Cancel row */}
            {isEditingProfile && (
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={profileUpdating}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all duration-200"
                >
                  {profileUpdating ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    // Reset inputs
                    setProfileForm({
                      name: donor.name || '',
                      dob: donor.dob ? new Date(donor.dob).toISOString().split('T')[0] : '',
                      gender: donor.gender || 'Male',
                      phone: donor.phone || '',
                      address: donor.address || '',
                      medicalInfo: donor.medical_info || '',
                    });
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ───── MAIN DASHBOARD TAB ─────
  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-100 text-green-800 px-4 py-3 rounded-xl border border-green-200 text-sm font-semibold">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-100 text-red-800 px-4 py-3 rounded-xl border border-red-200 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Donations */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-4">
          <div className="h-10 w-10 bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shrink-0">
            <Droplets className="h-5.5 w-5.5 fill-current" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total Donations</p>
            <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{donations.length}</h4>
          </div>
        </div>

        {/* Blood Group */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-4">
          <div className="h-10 w-10 bg-brand-100 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center shrink-0 font-black text-sm">
            {donor.blood_group}
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Blood Group Type</p>
            <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{donor.blood_group}</h4>
          </div>
        </div>

        {/* Last Donation */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-4">
          <div className="h-10 w-10 bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
            <History className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Last Donation Date</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString() : 'Never Donated'}
            </h4>
          </div>
        </div>

        {/* Next Eligible Date */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center space-x-4">
          <div className="h-10 w-10 bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Next Eligible Date</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {eligibility.isEligible ? 'Eligible Now' : new Date(eligibility.nextEligibleDate).toLocaleDateString()}
            </h4>
          </div>
        </div>
      </div>

      {/* Grid: Cooldown widget */}
      <div className="grid grid-cols-1 gap-6">
        {/* Cooldown & Availability Widget */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-col justify-between md:col-span-1">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Donation Eligibility Status (56-Day Rule)</p>
            <div className="flex items-center space-x-3 mt-4">
              {eligibility.isEligible ? (
                <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <ShieldCheck className="h-7 w-7" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7 animate-bounce" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  {eligibility.isEligible
                    ? 'You are eligible to donate blood!'
                    : `Not Eligible Until ${eligibility.nextEligibleDate ? new Date(eligibility.nextEligibleDate).toLocaleDateString() : 'calculating...'}`}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{eligibility.reason}</p>
                {!eligibility.isEligible && eligibility.daysLeft && (
                  <p className="text-xs text-amber-600 font-bold mt-1">{eligibility.daysLeft} days remaining in cooldown</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Update Availability Status:</span>
            <select
              value={donor.availability_status}
              onChange={handleStatusChange}
              disabled={!eligibility.isEligible && donor.availability_status === 'Unavailable'}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Emergency Alerts Panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Heart className="h-4.5 w-4.5 text-red-600 fill-current" />
          <span>Active Compatible Emergency Alerts</span>
        </h3>

        {matchingEmergencyRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No active emergency blood requests matching your blood type at this time.
          </div>
        ) : (
          <div className="space-y-4">
            {matchingEmergencyRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 border border-red-100 dark:border-red-950/40 bg-red-50/20 dark:bg-red-950/5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase rounded tracking-wider">
                      Emergency {req.blood_group}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Needed at {req.hospital_name || 'City General Hospital'}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <strong>Patient:</strong> {req.patient_name} &bull; <strong>Component:</strong> {req.component} &bull; <strong>Required:</strong> {req.volume_ml} ml
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center space-x-1 mt-1">
                    <MapPin className="h-3 w-3 shrink-0 text-red-600" />
                    <span>{req.delivery_address}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleAcceptEmergency(req.id, req.patient_name, req.blood_group, req.volume_ml)}
                  disabled={!eligibility.isEligible}
                  title={!eligibility.isEligible ? `Not eligible until ${eligibility.nextEligibleDate}` : ''}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow transition"
                >
                  Accept & Schedule
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* direct incoming requests summary (if any) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Bell className="h-4.5 w-4.5 text-brand-600" />
          <span>Recent Direct Patient Requests</span>
        </h3>

        {incomingRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No direct patient requests received recently.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {incomingRequests.map((req) => (
              <div key={req.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{req.patient_name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Date: {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${REQUEST_STATUS_STYLES[req.request_status] || REQUEST_STATUS_STYLES.Pending}`}>
                    {req.request_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Ticket Modal popup */}
      {showTicket && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-sm w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center space-y-4 shadow-2xl animate-fade-in">
            <h4 className="text-md font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center justify-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Donor Schedule Ticket</span>
            </h4>
            {/* QR Code image removed per request */}

            {ticketDetails && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-[10px] text-left space-y-1 text-slate-600 dark:text-slate-300">
                <p><strong>Holder Name:</strong> {donor.name}</p>
                <p><strong>Blood Group:</strong> {ticketDetails.bloodGroup}</p>
                <p><strong>Reference:</strong> {ticketDetails.patientName}</p>
                <p><strong>Date Generated:</strong> {ticketDetails.date}</p>
              </div>
            )}

            <button
              onClick={() => setShowTicket(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition"
            >
              Close Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
