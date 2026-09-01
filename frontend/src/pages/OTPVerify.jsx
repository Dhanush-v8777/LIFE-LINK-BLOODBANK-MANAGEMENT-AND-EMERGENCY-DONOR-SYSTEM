import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { Heart, KeyRound, AlertCircle, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function OTPVerify() {
  const location = useLocation();
  const navigate = useNavigate();

  // Support manual email entry if page is refreshed (state lost)
  const [emailInput, setEmailInput] = useState(() => location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [type] = useState(() => location.state?.type || 'Registration');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailInput.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (otp.length !== 6) {
      setError('OTP must be exactly 6 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email: emailInput.trim(), otp, type });
      setLoading(false);

      if (res.data.success) {
        setSuccess('OTP verified successfully! Redirecting...');
        setTimeout(() => {
          if (type === 'PasswordReset') {
            navigate('/reset-password', { state: { email: emailInput.trim(), otp } });
          } else {
            navigate('/login');
          }
        }, 1500);
      } else {
        setError(res.data.message || 'OTP validation failed');
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Invalid or expired OTP code. Please try resending a new OTP.');
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    if (!emailInput.trim()) {
      setError('Please enter your email address first');
      return;
    }

    setResendLoading(true);
    try {
      if (type === 'PasswordReset') {
        await api.post('/auth/forgot-password', { email: emailInput.trim() });
        setSuccess('A new password reset OTP has been sent to your email.');
      } else {
        await api.post('/auth/resend-otp', { email: emailInput.trim() });
        setSuccess('A new verification OTP has been sent to your email.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Resend OTP request failed. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 p-8 space-y-6 text-center animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3 shadow-md">
            <Heart className="h-7 w-7 fill-current text-red-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Verify OTP</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter the 6-digit verification code sent to your email
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs font-semibold justify-center">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success notification */}
        {success && (
          <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-xs font-semibold justify-center">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Email field */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Your Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                autoComplete="off"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* OTP field */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              6-Digit Verification Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                maxLength="6"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-lg tracking-widest font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6 || !emailInput.trim()}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all duration-200 flex items-center justify-center"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Verify Code'
            )}
          </button>
        </form>

        <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || !emailInput.trim()}
              className="font-bold text-brand-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>

          <div className="flex items-center justify-center space-x-4 text-xs">
            <Link to="/register" className="flex items-center space-x-1 text-slate-500 hover:text-brand-600 transition">
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Register</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <Link to="/login" className="text-slate-500 hover:text-brand-600 transition">
              Sign In Instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
