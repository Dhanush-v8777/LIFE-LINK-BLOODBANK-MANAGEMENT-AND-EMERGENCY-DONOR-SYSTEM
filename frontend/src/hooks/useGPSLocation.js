import { useState, useCallback } from 'react';

/**
 * Reusable hook for browser Geolocation API.
 * Returns { status, coords, error, detect }.
 *
 * status: 'idle' | 'detecting' | 'success' | 'denied' | 'unavailable' | 'timeout' | 'error'
 * coords: { lat, lng } | null
 * error: string | null
 * detect: () => void — call this to trigger geolocation
 */
export default function useGPSLocation() {
  const [status, setStatus] = useState('idle');
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setStatus('detecting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setStatus('success');
        setError(null);
      },
      (err) => {
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            setStatus('denied');
            setError('Location permission denied. Please allow location access in your browser settings and try again.');
            break;
          case 2: // POSITION_UNAVAILABLE
            setStatus('unavailable');
            setError('Location unavailable on this device. Please check your GPS settings.');
            break;
          case 3: // TIMEOUT
            setStatus('timeout');
            setError('Location detection timed out. Please try again.');
            break;
          default:
            setStatus('error');
            setError('An unknown error occurred while detecting location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }, []);

  return { status, coords, error, detect };
}
