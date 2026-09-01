import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Heart, AlertCircle, Phone, MapPin, ShieldAlert, Award, Navigation, Loader, CheckCircle } from 'lucide-react';
import useGPSLocation from '../hooks/useGPSLocation';
import AddressAutocomplete from '../components/AddressAutocomplete';

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const [roleName, setRoleName] = useState('Donor'); // Default role
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    bloodGroup: 'O+',
    dob: '',
    gender: 'Male',
    phone: '',
    address: '',
    medicalInfo: '',
    availabilityStatus: 'Available',
    licenseNumber: '',
    contactPerson: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // GPS location hook (optional during registration)
  const { status: gpsStatus, coords: gpsCoords, error: gpsError, detect: detectGPS } = useGPSLocation();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field Validations
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in standard fields (Name, Email, Password)');
      return;
    }

    if (roleName === 'Donor' || roleName === 'Patient') {
      if (!formData.bloodGroup || !formData.dob || !formData.gender || !formData.phone || !formData.address) {
        setError('Please fill in all medical, contact, and address fields');
        return;
      }
    } else {
      // Hospital / Staff
      if (!formData.licenseNumber || !formData.contactPerson || !formData.phone || !formData.address) {
        setError('Please fill in all hospital/bank license, contact person, phone, and address details');
        return;
      }
    }

    setLoading(true);
    const regPayload = { ...formData, roleName };
    // Attach GPS coordinates if detected
    if (gpsCoords) {
      regPayload.latitude = gpsCoords.lat;
      regPayload.longitude = gpsCoords.lng;
    }
    const res = await register(regPayload);
    setLoading(false);

    if (res.success) {
      // Redirect to verification view
      navigate('/verify-otp', { state: { email: formData.email, type: 'Registration' } });
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 p-8 space-y-6 animate-fade-in my-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3 shadow-md">
            <Heart className="h-7 w-7 fill-current text-red-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Create LifeLink Account</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Join the network to matching blood and donate/receive units</p>
        </div>

        {/* Display Errors */}
        {error && (
          <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs font-semibold">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          {/* Role selection dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Register As</label>
            <select
              name="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
            >
              <option value="Donor">Donor (Donate Blood)</option>
              <option value="Patient">Patient (Request Blood)</option>
              <option value="Hospital">Hospital / Clinic</option>
              <option value="Blood Bank Staff">Blood Bank Staff</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Common Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Full Name / Org Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. John Doe"
                  autoComplete="off"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Common Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@domain.com"
                  autoComplete="off"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Common Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="password"
                  required
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Common Phone */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  autoComplete="off"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC DEPENDENT FIELDS */}
          {(roleName === 'Donor' || roleName === 'Patient') && (
            <div className="p-4 bg-brand-50/50 dark:bg-slate-900/30 border border-brand-100 dark:border-slate-700/60 rounded-2xl space-y-4">
              <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Medical & Demographics</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Blood Group */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* DOB */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center space-x-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-brand-600" />
                  <span>Medical Information / History</span>
                </label>
                <textarea
                  name="medicalInfo"
                  value={formData.medicalInfo}
                  onChange={handleInputChange}
                  placeholder="Mention active conditions, allergies, or medications (Optional)"
                  rows="2"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Availability Switch (Donor Only) */}
              {roleName === 'Donor' && (
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Availability Status</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Available to match in emergency requests nearby</p>
                  </div>
                  <select
                    name="availabilityStatus"
                    value={formData.availabilityStatus}
                    onChange={handleInputChange}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                  >
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {(roleName === 'Hospital' || roleName === 'Blood Bank Staff') && (
            <div className="p-4 bg-brand-50/50 dark:bg-slate-900/30 border border-brand-100 dark:border-slate-700/60 rounded-2xl space-y-4">
              <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Institution Credentials</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* License Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">License Registration ID</label>
                  <div className="relative">
                    <Award className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. REG-12345-STATE"
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Contact Person */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Authorized Contact Person</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      placeholder="e.g. Dr. Sarah Connor"
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Common Address field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center space-x-1">
              <MapPin className="h-4 w-4 text-brand-600" />
              <span>Full Address Location</span>
            </label>
            <AddressAutocomplete
              required
              name="address"
              value={formData.address}
              onChange={(val) => setFormData((prev) => ({ ...prev, address: val }))}
              placeholder="Building, Street, Area City, State ZIP Code"
              rows={2}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* GPS Location Detection (Optional) */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <Navigation className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">GPS Location <span className="text-[10px] font-normal text-slate-400">(Optional)</span></p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Helps patients find you in nearby search</p>
                </div>
              </div>
              {gpsStatus === 'success' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                  <CheckCircle className="h-3 w-3" />
                  Detected
                </span>
              )}
            </div>

            {gpsStatus === 'idle' && (
              <button
                type="button"
                onClick={detectGPS}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm"
              >
                <MapPin className="h-3.5 w-3.5" />
                Detect My Location
              </button>
            )}

            {gpsStatus === 'detecting' && (
              <div className="flex items-center justify-center gap-2 py-2.5 text-indigo-600 text-xs font-semibold">
                <Loader className="h-3.5 w-3.5 animate-spin" />
                Detecting your location...
              </div>
            )}

            {gpsStatus === 'success' && gpsCoords && (
              <div className="flex items-center gap-2 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/10 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">Location detected! Coordinates will be saved with your account.</p>
              </div>
            )}

            {(gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout' || gpsStatus === 'error') && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 py-2 px-3 bg-amber-50 dark:bg-amber-950/10 rounded-lg border border-amber-200 dark:border-amber-900/30">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">{gpsError || 'Location detection failed.'} You can enable it later from your profile.</p>
                </div>
                <button
                  type="button"
                  onClick={detectGPS}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Try Again
                </button>
              </div>
            )}

            <p className="text-[10px] text-slate-400 dark:text-slate-500">Your exact coordinates are never shared. Only approximate distance is shown to others.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all duration-200 flex items-center justify-center"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand-600 hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
