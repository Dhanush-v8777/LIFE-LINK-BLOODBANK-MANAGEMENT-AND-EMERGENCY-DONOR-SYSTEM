import { useState } from 'react';
import {
  MapPin, Navigation, CheckCircle, AlertTriangle, Loader,
  Clock, ChevronDown, ChevronUp, Shield, Locate
} from 'lucide-react';
import useGPSLocation from '../hooks/useGPSLocation';
import api from '../utils/api';

/**
 * Self-contained GPS location card. Drop into any profile tab.
 * Props:
 *   profileData — the role-specific object (donor, patient, hospital, blood_bank)
 *                 expected to have: latitude, longitude, location_updated_at
 *   onLocationUpdated — optional callback after successful update
 */
export default function LocationCard({ profileData, onLocationUpdated }) {
  const { status: gpsStatus, coords, error: gpsError, detect } = useGPSLocation();
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const hasLocation = profileData?.latitude && profileData?.longitude;
  const updatedAt = profileData?.location_updated_at;

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const handleDetectAndSave = async () => {
    // If we already have coords from a recent detect, save immediately
    if (coords && gpsStatus === 'success') {
      await saveLocation(coords);
      return;
    }
    // Otherwise trigger detection first — the effect below will handle saving
    detect();
  };

  // When coords arrive after detect, auto-save
  const handleDetectClick = () => {
    setSaveResult(null);
    if (gpsStatus === 'success' && coords) {
      saveLocation(coords);
    } else {
      detect();
    }
  };

  // Watch for successful detection and auto-save
  if (gpsStatus === 'success' && coords && !saving && !saveResult) {
    saveLocation(coords);
  }

  async function saveLocation(c) {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await api.put('/auth/location', {
        latitude: c.lat,
        longitude: c.lng
      });
      if (res.data.success) {
        setSaveResult({ success: true, message: 'Location updated successfully!' });
        if (onLocationUpdated) onLocationUpdated();
      } else {
        setSaveResult({ success: false, message: res.data.message || 'Failed to save location' });
      }
    } catch (err) {
      setSaveResult({ success: false, message: err.response?.data?.message || 'Failed to save location' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Navigation className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">GPS Location</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Used for nearby blood search matching</p>
            </div>
          </div>

          {/* Status badge */}
          {hasLocation ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Location Set
              {updatedAt && <span className="text-emerald-500">· {formatTimeAgo(updatedAt)}</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-3 w-3" />
              No Location Set
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Current status display */}
        {hasLocation && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Location coordinates saved</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Your approximate location is used to show you in nearby search results. Exact coordinates are never shared with other users.
              </p>
            </div>
            {updatedAt && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(updatedAt)}
              </div>
            )}
          </div>
        )}

        {!hasLocation && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Location not set</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                Without a saved location, you won't appear in nearby search results. Click below to enable GPS detection.
              </p>
            </div>
          </div>
        )}

        {/* GPS error display */}
        {gpsError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-900/30">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-400 font-semibold">{gpsError}</p>
          </div>
        )}

        {/* Save result display */}
        {saveResult && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold border ${
            saveResult.success
              ? 'bg-green-50 dark:bg-green-950/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30'
              : 'bg-red-50 dark:bg-red-950/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
          }`}>
            {saveResult.success ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
            {saveResult.message}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleDetectClick}
          disabled={gpsStatus === 'detecting' || saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-300 disabled:to-purple-300 dark:disabled:from-indigo-800 dark:disabled:to-purple-800 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {gpsStatus === 'detecting' || saving ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              {saving ? 'Saving Location...' : 'Detecting Location...'}
            </>
          ) : (
            <>
              <Locate className="h-4 w-4" />
              {hasLocation ? 'Update My Location' : 'Enable GPS & Set Location'}
            </>
          )}
        </button>

        {/* Info accordion */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition uppercase tracking-wider"
        >
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Privacy & Security Info
          </span>
          {showInfo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showInfo && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2 text-[10px] text-slate-500 dark:text-slate-400 animate-fade-in">
            <p className="flex items-start gap-1.5">
              <Shield className="h-3 w-3 text-indigo-500 shrink-0 mt-0.5" />
              <span><strong className="text-slate-700 dark:text-slate-300">Coordinates are never shared.</strong> Only approximate distance (e.g., "2.3 km away") is shown to other users.</span>
            </p>
            <p className="flex items-start gap-1.5">
              <MapPin className="h-3 w-3 text-indigo-500 shrink-0 mt-0.5" />
              <span><strong className="text-slate-700 dark:text-slate-300">Used for nearby matching.</strong> When a patient searches for blood, your profile appears if you are within their search radius.</span>
            </p>
            <p className="flex items-start gap-1.5">
              <Navigation className="h-3 w-3 text-indigo-500 shrink-0 mt-0.5" />
              <span><strong className="text-slate-700 dark:text-slate-300">You control your location.</strong> Update it anytime or leave it unset. Location access works on localhost (dev) and HTTPS (production).</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
