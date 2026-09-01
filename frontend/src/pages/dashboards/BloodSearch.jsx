import { useState } from 'react';
import api from '../../utils/api';
import {
  Search, Droplets, Building2, Hospital, User,
  Send, CheckCircle, XCircle, AlertTriangle, MapPin, Phone, Clock, Heart, Calendar, Mail, Navigation
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const STATUS_COLORS = {
  Available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Unavailable: 'bg-red-100 text-red-700 border-red-200',
};

export default function BloodSearch() {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [activeTab, setActiveTab] = useState('donors');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Donor request modal state
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [patientMessage, setPatientMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestResult, setRequestResult] = useState(null);

  // Blood Bank request modal state
  const [showBBModal, setShowBBModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [bbRequestResult, setBBRequestResult] = useState(null);
  const [bbRequesting, setBBRequesting] = useState(false);
  const [bbForm, setBBForm] = useState({
    patientName: '',
    bloodGroup: '',
    unitsRequired: 1,
    hospitalName: '',
    contactNumber: '',
    requiredDate: '',
    emergencyNotes: ''
  });

  // Hospital request modal state
  const [showHospModal, setShowHospModal] = useState(false);
  const [selectedHosp, setSelectedHosp] = useState(null);
  const [hospRequestResult, setHospRequestResult] = useState(null);
  const [hospRequesting, setHospRequesting] = useState(false);
  const [hospForm, setHospForm] = useState({
    patientName: '',
    bloodGroup: '',
    unitsRequired: 1,
    contactNumber: '',
    requiredDate: '',
    emergencyNotes: ''
  });

  const openHospRequestModal = (hosp) => {
    setSelectedHosp(hosp);
    setHospRequestResult(null);
    setHospForm({
      patientName: '',
      bloodGroup: selectedGroup || '',
      unitsRequired: 1,
      contactNumber: '',
      requiredDate: '',
      emergencyNotes: ''
    });
    setShowHospModal(true);
  };

  const handleSendHospRequest = async (e) => {
    e.preventDefault();
    if (!selectedHosp) return;
    setHospRequesting(true);
    setHospRequestResult(null);
    try {
      const res = await api.post('/hospitals/request', {
        hospitalId: selectedHosp.id,
        patientName: hospForm.patientName,
        bloodGroup: hospForm.bloodGroup,
        unitsRequired: parseInt(hospForm.unitsRequired),
        contactNumber: hospForm.contactNumber,
        requiredDate: hospForm.requiredDate,
        emergencyNotes: hospForm.emergencyNotes || undefined
      });
      setHospRequestResult({ success: true, message: res.data.message });
      setTimeout(() => setShowHospModal(false), 3000);
    } catch (err) {
      setHospRequestResult({ success: false, message: err.response?.data?.message || 'Failed to submit request' });
    } finally {
      setHospRequesting(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedGroup) {
      setSearchError('Please select a blood group to search');
      return;
    }
    setSearchError('');
    setLoading(true);
    setResults(null);
    try {
      const res = await api.get(`/patients/search-donors?bloodGroup=${encodeURIComponent(selectedGroup)}`);
      if (res.data.success) {
        setResults(res.data);
        setActiveTab('donors');
      }
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openDonorRequestModal = (donor) => {
    setSelectedDonor(donor);
    setPatientMessage('');
    setRequestResult(null);
    setShowDonorModal(true);
  };

  const handleSendDonorRequest = async () => {
    if (!selectedDonor) return;
    setRequesting(true);
    setRequestResult(null);
    try {
      const res = await api.post('/patients/send-donor-request', {
        donorId: selectedDonor.donor_id,
        bloodGroup: selectedGroup,
        patientMessage
      });
      setRequestResult({ success: true, message: res.data.message });
      setTimeout(() => {
        setShowDonorModal(false);
        handleSearch();
      }, 2000);
    } catch (err) {
      setRequestResult({ success: false, message: err.response?.data?.message || 'Failed to send request' });
    } finally {
      setRequesting(false);
    }
  };

  const openBBRequestModal = (bank) => {
    setSelectedBank(bank);
    setBBRequestResult(null);
    setBBForm({
      patientName: '',
      bloodGroup: selectedGroup || '',
      unitsRequired: 1,
      hospitalName: '',
      contactNumber: '',
      requiredDate: '',
      emergencyNotes: ''
    });
    setShowBBModal(true);
  };

  const handleSendBBRequest = async (e) => {
    e.preventDefault();
    if (!selectedBank) return;
    setBBRequesting(true);
    setBBRequestResult(null);
    try {
      const res = await api.post('/bbr', {
        bloodBankId: selectedBank.id,
        patientName: bbForm.patientName,
        bloodGroup: bbForm.bloodGroup,
        unitsRequired: parseInt(bbForm.unitsRequired),
        hospitalName: bbForm.hospitalName || undefined,
        contactNumber: bbForm.contactNumber,
        requiredDate: bbForm.requiredDate,
        emergencyNotes: bbForm.emergencyNotes || undefined
      });
      setBBRequestResult({ success: true, message: res.data.message });
      setTimeout(() => setShowBBModal(false), 3000);
    } catch (err) {
      setBBRequestResult({ success: false, message: err.response?.data?.message || 'Failed to submit request' });
    } finally {
      setBBRequesting(false);
    }
  };

  const tabCounts = results ? {
    donors: results.donors.length,
    bloodBanks: results.bloodBanks.length,
    hospitals: results.hospitals.length,
  } : { donors: 0, bloodBanks: 0, hospitals: 0 };

  return (
    <div className="space-y-6">
      {/* Hero Search Bar */}
      <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-rose-800 rounded-2xl p-8 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl transform -translate-x-10 translate-y-10" />

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Find Blood Donors & Blood Banks</h2>
              <p className="text-sm text-red-100">Search for eligible donors, blood banks & hospitals</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-red-100 mb-1.5 uppercase tracking-wider">
                Select Blood Group
              </label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map(bg => (
                  <button
                    key={bg}
                    onClick={() => setSelectedGroup(bg)}
                    className={`py-2.5 rounded-xl text-sm font-black border-2 transition-all duration-150 ${
                      selectedGroup === bg
                        ? 'bg-white text-red-700 border-white shadow-lg scale-105'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSearch}
              disabled={loading || !selectedGroup}
              className="flex items-center space-x-2 px-8 py-3 bg-white text-red-700 font-black rounded-xl shadow-lg hover:bg-red-50 disabled:bg-white/50 disabled:text-red-400 transition-all duration-150 text-sm"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>{loading ? 'Searching...' : 'Search Now'}</span>
            </button>
            {searchError && (
              <p className="text-red-100 text-xs font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {searchError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            {[
              { key: 'donors', label: 'Eligible Donors', icon: User, count: tabCounts.donors, color: 'text-rose-600' },
              { key: 'bloodBanks', label: 'Blood Banks', icon: Building2, count: tabCounts.bloodBanks, color: 'text-blue-600' },
              { key: 'hospitals', label: 'Hospitals', icon: Hospital, count: tabCounts.hospitals, color: 'text-purple-600' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all duration-150 border-b-2 ${
                  activeTab === tab.key
                    ? `border-red-600 text-red-600 bg-white dark:bg-slate-800`
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.key ? tab.color : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab.key ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Donors Tab */}
            {activeTab === 'donors' && (
              results.donors.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-16 w-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                    <User className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-semibold text-sm">No eligible donors found for <strong>{results.bloodGroup}</strong></p>
                  <p className="text-slate-400 text-xs mt-1">Try searching blood banks or hospitals for available stock</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.donors.map(donor => (
                    <div
                      key={donor.donor_id}
                      className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-200"
                    >
                      <div className="absolute top-4 right-4">
                        <span className="h-10 w-10 rounded-lg bg-red-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                          {donor.blood_group}
                        </span>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-100 to-rose-200 dark:from-red-900/30 dark:to-rose-900/20 flex items-center justify-center mb-3">
                        <User className="h-6 w-6 text-red-600" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 pr-14 truncate">{donor.name}</h4>
                      <div className="flex items-center justify-between gap-1.5 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[donor.availability_status] || STATUS_COLORS.Unavailable}`}>
                          {donor.availability_status}
                        </span>
                        {donor.distance_km !== undefined && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-full">
                            <Navigation className="h-3 w-3" /> {donor.distance_km} km
                          </span>
                        )}
                      </div>
                      {donor.phone && (
                        <p className="flex items-center gap-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                          <span>{donor.phone}</span>
                        </p>
                      )}
                      {donor.email && (
                        <p className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{donor.email}</span>
                        </p>
                      )}
                      {donor.address && (
                        <p className="flex items-start gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                          <span className="line-clamp-2">{donor.address}</span>
                        </p>
                      )}
                      {donor.last_donation_date && (
                        <p className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3 shrink-0" />
                          Last donated: {new Date(donor.last_donation_date).toLocaleDateString()}
                        </p>
                      )}
                      <button
                        onClick={() => openDonorRequestModal(donor)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all duration-150 shadow-sm hover:shadow-md"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Request Blood
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Blood Banks Tab */}
            {activeTab === 'bloodBanks' && (
              results.bloodBanks.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold text-sm">No blood banks registered</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.bloodBanks.map(bank => (
                    <div key={bank.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex items-center gap-2">
                          {bank.distance_km !== undefined && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-full">
                              <Navigation className="h-3 w-3" /> {bank.distance_km} km
                            </span>
                          )}
                          {bank.available_volume_ml > 0 ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                              {bank.available_volume_ml} ml {results.bloodGroup} Available
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400">
                              No {results.bloodGroup} in stock
                            </span>
                          )}
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{bank.name}</h4>
                      <p className="flex items-start gap-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {bank.address}
                      </p>
                      {bank.phone && (
                        <p className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {bank.phone}
                        </p>
                      )}
                      {bank.contact_person && (
                        <p className="text-xs text-slate-400 mt-1">Contact: <span className="text-slate-600 dark:text-slate-300 font-medium">{bank.contact_person}</span></p>
                      )}
                      {/* Request Blood Button */}
                      <button
                        onClick={() => openBBRequestModal(bank)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all duration-150 shadow-sm"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        Request Blood from This Bank
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Hospitals Tab */}
            {activeTab === 'hospitals' && (
              results.hospitals.length === 0 ? (
                <div className="text-center py-12">
                  <Hospital className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold text-sm">No hospitals registered</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.hospitals.map(hospital => (
                    <div key={hospital.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900/50 transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                            <Hospital className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{hospital.name}</h4>
                          </div>
                        </div>
                        {hospital.distance_km !== undefined && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-full shrink-0">
                            <Navigation className="h-3 w-3" /> {hospital.distance_km} km
                          </span>
                        )}
                      </div>
                      <p className="flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {hospital.address}
                      </p>
                      {hospital.phone && (
                        <p className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {hospital.phone}
                        </p>
                      )}
                      {hospital.contact_person && (
                        <p className="text-xs text-slate-400 mt-1">Contact: <span className="text-slate-600 dark:text-slate-300 font-medium">{hospital.contact_person}</span></p>
                      )}
                      <button
                        onClick={() => openHospRequestModal(hospital)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all duration-150 shadow-sm"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        Request Blood from This Hospital
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* â”€â”€â”€ Donor Request Modal â”€â”€â”€ */}
      {showDonorModal && selectedDonor && (
        <div className="fixed inset-0 bg-slate-900/70 dark:bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 p-5 text-white">
              <h3 className="font-black text-base flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Blood Request to Donor
              </h3>
              <p className="text-red-100 text-xs mt-1">Notify this donor via email and dashboard</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Requesting from</p>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedDonor.name}</p>
                  <p className="text-xs text-slate-400">Blood Group: <strong className="text-red-600">{selectedDonor.blood_group}</strong></p>
                </div>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                <p className="text-xs text-red-700 dark:text-red-300 font-semibold">
                  Blood Group Required: <span className="font-black text-sm">{selectedGroup}</span>
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Personal Message (Optional)</label>
                <textarea
                  value={patientMessage}
                  onChange={e => setPatientMessage(e.target.value)}
                  placeholder="Add context about your situation..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition resize-none"
                />
              </div>
              {requestResult && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold ${
                  requestResult.success
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {requestResult.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{requestResult.message}</span>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowDonorModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
                <button
                  onClick={handleSendDonorRequest}
                  disabled={requesting || requestResult?.success}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {requesting ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>{requesting ? 'Sending...' : 'Send Request & Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€ Blood Bank Request Modal â”€â”€â”€ */}
      {showBBModal && selectedBank && (
        <div className="fixed inset-0 bg-slate-900/70 dark:bg-slate-950/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in my-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
              <h3 className="font-black text-base flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Request Blood from Blood Bank
              </h3>
              <p className="text-blue-100 text-xs mt-1">{selectedBank.name}</p>
            </div>

            <form onSubmit={handleSendBBRequest} className="p-5 space-y-4">
              {/* Bank info */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <Building2 className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedBank.name}</p>
                  <p className="text-xs text-slate-500">{selectedBank.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={bbForm.patientName}
                    onChange={e => setBBForm({...bbForm, patientName: e.target.value})}
                    placeholder="Full name"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Blood Group *</label>
                  <select
                    required
                    value={bbForm.bloodGroup}
                    onChange={e => setBBForm({...bbForm, bloodGroup: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                  >
                    <option value="">Select group</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Units Required *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={bbForm.unitsRequired}
                    onChange={e => setBBForm({...bbForm, unitsRequired: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={bbForm.contactNumber}
                    onChange={e => setBBForm({...bbForm, contactNumber: e.target.value})}
                    placeholder="+91 XXXXXXXXXX"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Hospital Name</label>
                  <input
                    type="text"
                    value={bbForm.hospitalName}
                    onChange={e => setBBForm({...bbForm, hospitalName: e.target.value})}
                    placeholder="If applicable"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Required Date *</label>
                  <input
                    type="date"
                    required
                    value={bbForm.requiredDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setBBForm({...bbForm, requiredDate: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Emergency Notes (Optional)</label>
                <textarea
                  value={bbForm.emergencyNotes}
                  onChange={e => setBBForm({...bbForm, emergencyNotes: e.target.value})}
                  placeholder="Describe urgency, medical condition, or any special requirements..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition resize-none"
                />
              </div>

              {/* Email notice */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  An email notification will be sent to <strong>{selectedBank.name}</strong> with your request details. You'll be notified when they respond.
                </p>
              </div>

              {bbRequestResult && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold ${
                  bbRequestResult.success
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {bbRequestResult.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{bbRequestResult.message}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowBBModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
                <button
                  type="submit"
                  disabled={bbRequesting || bbRequestResult?.success}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {bbRequesting ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>{bbRequesting ? 'Submitting...' : 'Submit Request & Notify Bank'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Hospital Request Modal */}
      {showHospModal && selectedHosp && (
        <div className="fixed inset-0 bg-slate-900/70 dark:bg-slate-950/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in my-4">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-5 text-white">
              <h3 className="font-black text-base flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Request Blood from Hospital
              </h3>
              <p className="text-purple-100 text-xs mt-1">{selectedHosp.name}</p>
            </div>

            <form onSubmit={handleSendHospRequest} className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                <Hospital className="h-5 w-5 text-purple-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedHosp.name}</p>
                  <p className="text-xs text-slate-500">{selectedHosp.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={hospForm.patientName}
                    onChange={e => setHospForm({...hospForm, patientName: e.target.value})}
                    placeholder="Full name"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Blood Group *</label>
                  <select
                    required
                    value={hospForm.bloodGroup}
                    onChange={e => setHospForm({...hospForm, bloodGroup: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                  >
                    <option value="">Select group</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Units Required *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={hospForm.unitsRequired}
                    onChange={e => setHospForm({...hospForm, unitsRequired: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={hospForm.contactNumber}
                    onChange={e => setHospForm({...hospForm, contactNumber: e.target.value})}
                    placeholder="+91 XXXXXXXXXX"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Required Date *</label>
                <input
                  type="date"
                  required
                  value={hospForm.requiredDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setHospForm({...hospForm, requiredDate: e.target.value})}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Emergency Notes (Optional)</label>
                <textarea
                  value={hospForm.emergencyNotes}
                  onChange={e => setHospForm({...hospForm, emergencyNotes: e.target.value})}
                  placeholder="Describe medical condition or urgency..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition resize-none"
                />
              </div>

              {hospRequestResult && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold ${
                  hospRequestResult.success
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {hospRequestResult.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{hospRequestResult.message}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowHospModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
                <button
                  type="submit"
                  disabled={hospRequesting || hospRequestResult?.success}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {hospRequesting ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>{hospRequesting ? 'Submitting...' : 'Submit Request to Hospital'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
