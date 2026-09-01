import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import {
  Search, Droplets, Building2, Hospital, User, Navigation, MapPin, Phone,
  Clock, Send, CheckCircle, XCircle, AlertTriangle, Heart, Calendar,
  Locate, ChevronDown, Loader, Compass, Zap, Shield
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const STATUS_COLORS = {
  Eligible: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'In Cooldown': 'bg-amber-100 text-amber-700 border-amber-200',
  Available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Unavailable: 'bg-red-100 text-red-700 border-red-200',
};

export default function NearbySearch() {
  // ─── Search State ───
  const [selectedGroup, setSelectedGroup] = useState('');
  const [activeTab, setActiveTab] = useState('donors');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [radiusKm, setRadiusKm] = useState(20);

  // ─── Location State ───
  const [locationMode, setLocationMode] = useState('auto'); // 'auto' | 'city' | 'pincode'
  const [userCoords, setUserCoords] = useState({ lat: null, lng: null });
  const [geoStatus, setGeoStatus] = useState('idle'); // 'idle' | 'detecting' | 'success' | 'denied' | 'error'
  const [selectedCity, setSelectedCity] = useState('');
  const [cityCoords, setCityCoords] = useState({ lat: null, lng: null });
  const [pincodeInput, setPincodeInput] = useState('');
  const [cities, setCities] = useState([]);

  // ─── Donor Request Modal ───
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [patientMessage, setPatientMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestResult, setRequestResult] = useState(null);

  // ─── Blood Bank Request Modal ───
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

  // ─── Fetch cities list on mount ───
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await api.get('/nearby/cities');
        if (res.data.success) {
          setCities(res.data.cities);
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      }
    };
    fetchCities();
  }, []);

  // ─── Auto-detect location on mount ───
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setLocationMode('city');
      return;
    }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGeoStatus('success');
        setLocationMode('auto');
      },
      (error) => {
        console.warn('Geolocation denied/error:', error.message);
        setGeoStatus(error.code === 1 ? 'denied' : 'error');
        setLocationMode('city');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // ─── Search handler ───
  const handleSearch = async () => {
    if (!selectedGroup) {
      setSearchError('Please select a blood group to search');
      return;
    }

    // Build query params
    const params = new URLSearchParams();
    params.append('bloodGroup', selectedGroup);
    params.append('radiusKm', radiusKm.toString());

    if (locationMode === 'auto' && userCoords.lat && userCoords.lng) {
      params.append('latitude', userCoords.lat.toString());
      params.append('longitude', userCoords.lng.toString());
    } else if (locationMode === 'city' && selectedCity) {
      if (cityCoords.lat && cityCoords.lng) {
        params.append('latitude', cityCoords.lat.toString());
        params.append('longitude', cityCoords.lng.toString());
      } else {
        params.append('city', selectedCity);
      }
    } else if (locationMode === 'pincode' && pincodeInput.trim()) {
      params.append('pincode', pincodeInput.trim());
    } else {
      setSearchError('Please provide your location — enable GPS, select a city, or enter a PIN code');
      return;
    }

    setSearchError('');
    setLoading(true);
    setResults(null);

    try {
      const res = await api.get(`/nearby/search?${params.toString()}`);
      if (res.data.success) {
        setResults(res.data);
        setActiveTab('donors');
      }
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Nearby search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Donor request modal handlers ───
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

  // ─── Blood Bank request modal handlers ───
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

  const tabCounts = results ? results.counts : { donors: 0, hospitals: 0, bloodBanks: 0 };

  // ─── Distance badge color helper ───
  const getDistanceBadge = (km) => {
    if (km <= 5) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (km <= 15) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (km <= 30) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════ HERO SEARCH PANEL ═══════════════════════ */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-700 to-fuchsia-800 rounded-2xl p-6 sm:p-8 text-white overflow-hidden shadow-2xl">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl transform translate-x-24 -translate-y-24" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-2xl transform -translate-x-16 translate-y-16" />
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-fuchsia-400/10 rounded-full blur-xl transform -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          {/* Title */}
          <div className="flex items-center space-x-3 mb-1">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                Nearby Blood Search
                <span className="px-2 py-0.5 bg-white/15 text-[10px] font-bold rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/10">New</span>
              </h2>
              <p className="text-sm text-purple-100">Find donors, hospitals &amp; blood banks near your location</p>
            </div>
          </div>

          {/* Blood Group Selector */}
          <div className="mt-6">
            <label className="block text-xs font-bold text-purple-100 mb-2 uppercase tracking-wider">
              Select Blood Group
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map(bg => (
                <button
                  key={bg}
                  onClick={() => setSelectedGroup(bg)}
                  className={`py-2.5 rounded-xl text-sm font-black border-2 transition-all duration-200 ${
                    selectedGroup === bg
                      ? 'bg-white text-purple-700 border-white shadow-lg scale-105'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Location Section ─── */}
          <div className="mt-5 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-purple-100 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5" />
                Your Location
              </p>
              {geoStatus === 'success' && locationMode === 'auto' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-200 text-[10px] font-bold rounded-full border border-emerald-400/30">
                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  GPS Active
                </span>
              )}
            </div>

            {/* Location mode tabs */}
            <div className="flex gap-2 mb-3">
              {[
                { mode: 'auto', label: 'GPS Auto-Detect', icon: Locate, disabled: geoStatus === 'denied' || geoStatus === 'error' },
                { mode: 'city', label: 'Select City', icon: Building2, disabled: false },
                { mode: 'pincode', label: 'Enter PIN Code', icon: MapPin, disabled: false },
              ].map(({ mode, label, icon: Icon, disabled }) => (
                <button
                  key={mode}
                  onClick={() => {
                    if (!disabled) {
                      setLocationMode(mode);
                      if (mode === 'auto') detectLocation();
                    }
                  }}
                  disabled={disabled}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all duration-150 border ${
                    locationMode === mode
                      ? 'bg-white/20 text-white border-white/30 shadow-sm'
                      : disabled
                      ? 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* GPS detecting state */}
            {locationMode === 'auto' && geoStatus === 'detecting' && (
              <div className="flex items-center gap-2 text-purple-200 text-xs py-2">
                <Loader className="h-3.5 w-3.5 animate-spin" />
                Detecting your location...
              </div>
            )}
            {locationMode === 'auto' && geoStatus === 'success' && (
              <div className="flex items-center gap-2 text-emerald-200 text-xs py-2">
                <CheckCircle className="h-3.5 w-3.5" />
                Location detected — GPS coordinates locked
              </div>
            )}
            {locationMode === 'auto' && (geoStatus === 'denied' || geoStatus === 'error') && (
              <div className="flex items-center gap-2 text-amber-200 text-xs py-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                {geoStatus === 'denied' ? 'Location permission denied. Please select a city or enter a PIN code.' : 'Geolocation not available. Use city or PIN code instead.'}
              </div>
            )}

            {/* City selector */}
            {locationMode === 'city' && (
              <div className="mt-1">
                <AddressAutocomplete
                  name="selectedCity"
                  value={selectedCity}
                  rows={1}
                  onChange={val => setSelectedCity(val)}
                  onLocationSelect={(address, lat, lng) => setCityCoords({ lat, lng })}
                  placeholder="Type any village, town, or city in Karnataka..."
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-white/15 backdrop-blur-sm text-white border border-white/20 rounded-lg placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
                />
              </div>
            )}

            {/* PIN code input */}
            {locationMode === 'pincode' && (
              <div className="mt-1">
                <input
                  type="text"
                  value={pincodeInput}
                  onChange={e => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit PIN code"
                  maxLength={6}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-white/15 backdrop-blur-sm text-white border border-white/20 rounded-lg placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
                />
              </div>
            )}
          </div>

          {/* ─── Radius Slider ─── */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-purple-100 uppercase tracking-wider">Search Radius</label>
              <span className="px-2 py-0.5 bg-white/15 text-white text-xs font-black rounded-full">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radiusKm}
              onChange={e => setRadiusKm(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <div className="flex justify-between text-[10px] text-purple-200 mt-1">
              <span>5 km</span>
              <span>50 km</span>
              <span>100 km</span>
            </div>
          </div>

          {/* ─── Search Button ─── */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSearch}
              disabled={loading || !selectedGroup}
              className="flex items-center space-x-2 px-8 py-3 bg-white text-purple-700 font-black rounded-xl shadow-lg hover:bg-purple-50 disabled:bg-white/50 disabled:text-purple-400 transition-all duration-200 text-sm hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>{loading ? 'Searching...' : 'Search Nearby'}</span>
            </button>
            {searchError && (
              <p className="text-amber-200 text-xs font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {searchError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ RESULTS ═══════════════════════ */}
      {results && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Result header with location info */}
          <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-purple-500" />
                Showing results within <span className="text-slate-800 dark:text-slate-200">{results.radiusKm} km</span> for blood group <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-black text-[10px]">{results.bloodGroup}</span>
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                Location: {results.locationSource === 'gps' ? '📡 GPS' : results.locationSource === 'city' ? '🏙️ City' : '📮 PIN Code'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            {[
              { key: 'donors', label: 'Nearby Donors', icon: User, count: tabCounts.donors, color: 'text-rose-600', gradient: 'from-rose-500 to-red-600' },
              { key: 'bloodBanks', label: 'Blood Banks', icon: Building2, count: tabCounts.bloodBanks, color: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
              { key: 'hospitals', label: 'Hospitals', icon: Hospital, count: tabCounts.hospitals, color: 'text-purple-600', gradient: 'from-purple-500 to-fuchsia-600' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all duration-150 border-b-2 ${
                  activeTab === tab.key
                    ? `border-purple-600 text-purple-700 dark:text-purple-400 bg-white dark:bg-slate-800`
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.key ? tab.color : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab.key ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ─── DONORS TAB ─── */}
            {activeTab === 'donors' && (
              results.nearbyDonors.length === 0 ? (
                <div className="text-center py-16">
                  <div className="h-16 w-16 mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                    <User className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-bold text-sm">No eligible donors found nearby</p>
                  <p className="text-slate-400 text-xs mt-1">Try increasing the search radius or searching for a different blood group</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.nearbyDonors.map((donor, index) => (
                    <div
                      key={donor.donor_id}
                      className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-xl hover:border-purple-200 dark:hover:border-purple-900/50 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      {/* Distance badge */}
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                        <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                          {donor.blood_group}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${getDistanceBadge(donor.distance_km)}`}>
                          <Navigation className="h-2.5 w-2.5" />
                          {donor.distance_km} km
                        </span>
                      </div>

                      {/* Avatar */}
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-200 dark:from-purple-900/30 dark:to-fuchsia-900/20 flex items-center justify-center mb-3 shadow-sm">
                        <User className="h-6 w-6 text-purple-600" />
                      </div>

                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 pr-20 truncate">{donor.name}</h4>

                      {/* Eligibility */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${STATUS_COLORS[donor.eligibility_status] || STATUS_COLORS.Available}`}>
                          <Shield className="h-2.5 w-2.5" />
                          {donor.eligibility_status}
                        </span>
                      </div>

                      {/* Address */}
                      {donor.address && (
                        <p className="flex items-start gap-1 mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                          <span className="line-clamp-2">{donor.address}</span>
                        </p>
                      )}

                      {/* Last donation */}
                      {donor.last_donation_date && (
                        <p className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400">
                          <Calendar className="h-3 w-3 shrink-0" />
                          Last donated: {new Date(donor.last_donation_date).toLocaleDateString()}
                        </p>
                      )}

                      {/* Closest ribbon */}
                      {index === 0 && (
                        <div className="absolute -top-px -left-px px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-black uppercase tracking-wider rounded-tl-xl rounded-br-xl shadow-sm">
                          ⚡ Closest
                        </div>
                      )}

                      {/* Contact button */}
                      <button
                        onClick={() => openDonorRequestModal(donor)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Contact Donor
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ─── BLOOD BANKS TAB ─── */}
            {activeTab === 'bloodBanks' && (
              results.nearbyBloodBanks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="h-16 w-16 mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                    <Building2 className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-bold text-sm">No blood banks found nearby</p>
                  <p className="text-slate-400 text-xs mt-1">Try increasing the search radius</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.nearbyBloodBanks.map((bank, index) => (
                    <div key={bank.id} className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 hover:-translate-y-0.5">
                      {/* Closest ribbon */}
                      {index === 0 && (
                        <div className="absolute -top-px -left-px px-2.5 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[9px] font-black uppercase tracking-wider rounded-tl-xl rounded-br-xl shadow-sm">
                          ⚡ Closest
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-900/20 flex items-center justify-center shadow-sm">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${getDistanceBadge(bank.distance_km)}`}>
                            <Navigation className="h-2.5 w-2.5" />
                            {bank.distance_km} km
                          </span>
                          {bank.available_volume_ml > 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                              {bank.available_units} unit(s) · {bank.available_volume_ml} ml
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400">
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
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <a href={`tel:${bank.phone}`} className="hover:text-blue-600 transition">{bank.phone}</a>
                        </p>
                      )}
                      {bank.contact_person && (
                        <p className="text-xs text-slate-400 mt-1">Contact: <span className="text-slate-600 dark:text-slate-300 font-medium">{bank.contact_person}</span></p>
                      )}

                      <button
                        onClick={() => openBBRequestModal(bank)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        Request Blood from This Bank
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ─── HOSPITALS TAB ─── */}
            {activeTab === 'hospitals' && (
              results.nearbyHospitals.length === 0 ? (
                <div className="text-center py-16">
                  <div className="h-16 w-16 mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                    <Hospital className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-bold text-sm">No hospitals found nearby</p>
                  <p className="text-slate-400 text-xs mt-1">Try increasing the search radius</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.nearbyHospitals.map((hospital, index) => (
                    <div key={hospital.id} className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-xl hover:border-purple-200 dark:hover:border-purple-900/50 transition-all duration-300 hover:-translate-y-0.5">
                      {/* Closest ribbon */}
                      {index === 0 && (
                        <div className="absolute -top-px -left-px px-2.5 py-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-[9px] font-black uppercase tracking-wider rounded-tl-xl rounded-br-xl shadow-sm">
                          ⚡ Closest
                        </div>
                      )}

                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-100 to-fuchsia-200 dark:from-purple-900/30 dark:to-fuchsia-900/20 flex items-center justify-center shrink-0 shadow-sm">
                          <Hospital className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{hospital.name}</h4>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold border ${getDistanceBadge(hospital.distance_km)}`}>
                            <Navigation className="h-2.5 w-2.5" />
                            {hospital.distance_km} km away
                          </span>
                        </div>
                      </div>

                      <p className="flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {hospital.address}
                      </p>
                      {hospital.phone && (
                        <p className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <a href={`tel:${hospital.phone}`} className="hover:text-purple-600 transition">{hospital.phone}</a>
                        </p>
                      )}
                      {hospital.contact_person && (
                        <p className="text-xs text-slate-400 mt-1">Contact: <span className="text-slate-600 dark:text-slate-300 font-medium">{hospital.contact_person}</span></p>
                      )}

                      {/* Available blood groups */}
                      {hospital.available_blood_groups && hospital.available_blood_groups.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Available Blood Groups</p>
                          <div className="flex flex-wrap gap-1">
                            {hospital.available_blood_groups.map(bg => (
                              <span key={bg} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                bg === results.bloodGroup
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                              }`}>
                                {bg}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ DONOR REQUEST MODAL ═══════════════════════ */}
      {showDonorModal && selectedDonor && (
        <div className="fixed inset-0 bg-slate-900/70 dark:bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 p-5 text-white">
              <h3 className="font-black text-base flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Blood Request to Donor
              </h3>
              <p className="text-purple-100 text-xs mt-1">Notify this donor via email and dashboard</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Requesting from</p>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedDonor.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">Blood Group: <strong className="text-red-600">{selectedDonor.blood_group}</strong></span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getDistanceBadge(selectedDonor.distance_km)}`}>{selectedDonor.distance_km} km away</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl">
                <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition resize-none"
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
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 disabled:from-purple-300 disabled:to-fuchsia-300 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {requesting ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>{requesting ? 'Sending...' : 'Send Request & Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ BLOOD BANK REQUEST MODAL ═══════════════════════ */}
      {showBBModal && selectedBank && (
        <div className="fixed inset-0 bg-slate-900/70 dark:bg-slate-950/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in my-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white">
              <h3 className="font-black text-base flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Request Blood from Blood Bank
              </h3>
              <p className="text-blue-100 text-xs mt-1">{selectedBank.name} — {selectedBank.distance_km} km away</p>
            </div>

            <form onSubmit={handleSendBBRequest} className="p-5 space-y-4">
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
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-300 disabled:to-indigo-300 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {bbRequesting ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>{bbRequesting ? 'Submitting...' : 'Submit Request & Notify Bank'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
