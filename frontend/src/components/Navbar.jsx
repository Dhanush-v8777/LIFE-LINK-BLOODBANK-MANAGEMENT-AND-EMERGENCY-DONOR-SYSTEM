import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getDashboardPathForRole } from '../utils/roleUtils';
import { LogOut, Sun, Moon, Bell, User, Heart } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, markNotificationRead, clearNotifications } = useSocket();
  const [darkMode, setDarkMode] = useState(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.body.classList.add('dark');
      return true;
    }
    return false;
  });
  const [showNotif, setShowNotif] = useState(false);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  const handleLogoClick = () => {
    if (user) {
      navigate(getDashboardPathForRole(user.roleName));
    } else {
      navigate('/');
    }
  };

  const handleNotificationClick = async (n) => {
    if (n.id) {
      await markNotificationRead(n.id);
    }
    setShowNotif(false);

    if (!user) return;
    const reqId = n.requestId || n.request_id;
    const reqType = n.requestType || n.request_type;
    const role = user.roleName || '';

    if (/^donor$/i.test(role)) {
      navigate('/donor/blood-requests', { state: { highlightRequestId: reqId, requestType: reqType || 'donor_request' } });
    } else if (/^hospital$/i.test(role)) {
      navigate('/hospital/dashboard', { state: { highlightRequestId: reqId, requestType: reqType || 'hospital_request' } });
    } else if (/^blood\s*bank/i.test(role) || /^staff$/i.test(role)) {
      navigate('/staff/blood-requests', { state: { highlightRequestId: reqId, requestType: reqType || 'blood_bank_request' } });
    } else if (/^patient$/i.test(role)) {
      navigate('/patient/dashboard', { state: { highlightRequestId: reqId, requestType: reqType } });
    } else if (/^admin$/i.test(role)) {
      navigate('/admin/requests', { state: { highlightRequestId: reqId } });
    } else {
      navigate(getDashboardPathForRole(role));
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className="sticky top-0 z-40 w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm px-6 py-4 flex items-center justify-between">
      {/* Branding Logo */}
      <div 
        onClick={handleLogoClick}
        className="flex items-center space-x-2 text-brand-600 dark:text-brand-500 font-extrabold text-xl tracking-tight cursor-pointer"
      >
        <Heart className="h-6 w-6 fill-current animate-pulse text-red-600" />
        <span className="text-slate-800 dark:text-slate-100 font-bold">Life</span>
        <span>Link</span>
      </div>

      {/* Action Buttons & Profile */}
      <div className="flex items-center space-x-4">
        {/* Dark Mode toggle */}
        <button 
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications Dropdown */}
        {user && (
          <div className="relative">
            <button 
              onClick={() => setShowNotif(!showNotif)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition relative"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-600 animate-ping" />
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
                  </span>
                  {notifications.length > 0 && (
                    <button 
                      onClick={clearNotifications}
                      className="text-[10px] text-brand-600 hover:underline font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div 
                        key={n.id || i} 
                        onClick={() => handleNotificationClick(n)}
                        className={`px-4 py-3 border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer text-xs ${
                          n.isRead ? 'opacity-60' : 'font-semibold'
                        }`}
                      >
                        <p className="text-slate-700 dark:text-slate-200">{n.message}</p>
                        {n.createdAt && (
                          <span className="text-[9px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Info Display */}
        {user ? (
          <div className="flex items-center space-x-3 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium capitalize">{user.roleName}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs uppercase shadow-inner">
              {user.name ? user.name.charAt(0) : <User className="h-4 w-4" />}
            </div>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button onClick={() => navigate('/login')} className="text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 transition">Log In</button>
            <button onClick={() => navigate('/register')} className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-md font-bold hover:bg-brand-700 transition">Sign Up</button>
          </div>
        )}
      </div>
    </nav>
  );
}
