import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPathForRole } from '../utils/roleUtils';

/**
 * ProtectedRoute — guards any page that requires authentication.
 *
 * - Loading   → shows spinner
 * - No user   → redirects to "/" (landing page)
 * - Wrong role → redirects to logged-in user's correct role dashboard
 * - OK        → renders children
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated → back to landing page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Wrong role → redirect to user's actual role dashboard
  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.some(r => {
      if (r === 'Blood Bank Staff' || r === 'Blood Bank') {
        return /^blood\s*bank/i.test(user.roleName) || /^staff$/i.test(user.roleName);
      }
      return r.toLowerCase() === (user.roleName || '').toLowerCase();
    });

    if (!isAllowed) {
      return <Navigate to={getDashboardPathForRole(user.roleName)} replace />;
    }
  }

  return children;
}
