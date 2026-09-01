import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPathForRole } from '../utils/roleUtils';
import { Lock, Mail, Heart, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Role dashboard paths: getDashboardPath, /admin/dashboard, /staff/dashboard, /donor/dashboard, /patient/dashboard, /hospital/dashboard
  const getDashboardPath = (roleName) => getDashboardPathForRole(roleName);

  // If already logged in, redirect immediately away from login
  useEffect(() => {
    if (user) {
      navigate(getDashboardPath(user.roleName), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      // Read the freshly-set user from localStorage (state update may lag)
      try {
        const savedUser = JSON.parse(localStorage.getItem('user'));
        navigate(getDashboardPathForRole(savedUser?.roleName), { replace: true });
      } catch {
        navigate('/', { replace: true });
      }
    } else {
      if (res.unverified) {
        // Redirect to OTP verification with email state
        navigate('/verify-otp', { state: { email, type: 'Registration' } });
      } else {
        setError(res.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 p-8 space-y-6 animate-fade-in">
        {/* Branding header */}
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3 shadow-md">
            <Heart className="h-7 w-7 fill-current text-red-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Welcome to LifeLink</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sign in to access your blood bank dashboard</p>
        </div>

        {/* Display Errors */}
        {error && (
          <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs font-semibold">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Email field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="off"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-150"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Password</label>
              <Link 
                to="/forgot-password" 
                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 transition"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-150"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all duration-200 flex items-center justify-center animate-fade-in"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-brand-600 hover:underline">
            Register Now
          </Link>
        </div>
      </div>
    </div>
  );
}
