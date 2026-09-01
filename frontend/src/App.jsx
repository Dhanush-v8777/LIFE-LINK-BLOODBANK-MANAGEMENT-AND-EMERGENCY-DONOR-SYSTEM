import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { getDashboardPathForRole } from './utils/roleUtils';
import Login from './pages/Login';
import Register from './pages/Register';
import OTPVerify from './pages/OTPVerify';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';

// Dashboards & Sub-views
import AdminDashboard from './pages/dashboards/AdminDashboard';
import AdminDonorsList from './pages/dashboards/AdminDonorsList';
import AdminHospitalsList from './pages/dashboards/AdminHospitalsList';
import AdminRequestsList from './pages/dashboards/AdminRequestsList';
import AdminInventoryList from './pages/dashboards/AdminInventoryList';
import ReportsView from './pages/dashboards/ReportsView';
import DonorDashboard from './pages/dashboards/DonorDashboard';
import PatientDashboard from './pages/dashboards/PatientDashboard';
import HospitalDashboard from './pages/dashboards/HospitalDashboard';
import StaffDashboard from './pages/dashboards/StaffDashboard';
import RequestBloodForm from './pages/dashboards/RequestBloodForm';
import BloodSearch from './pages/dashboards/BloodSearch';
import NearbySearch from './pages/dashboards/NearbySearch';

/**
 * After login, redirect to the correct role dashboard (/admin/dashboard, etc).
 * Only rendered inside the protected workspace (user is always non-null here).
 */
function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={getDashboardPathForRole(user.roleName)} replace />;
}

/**
 * Guards auth pages (Login/Register) — if the user is already logged in,
 * send them straight to their dashboard instead of showing the auth form.
 */
function AuthRoute({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  return <Navigate to={getDashboardPathForRole(user.roleName)} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              {/* ── PUBLIC LANDING PAGE (default route) ── */}
              <Route path="/" element={<LandingPage />} />

              {/* ── AUTH PAGES (redirect away if already logged in) ── */}
              <Route path="/login"          element={<AuthRoute><Login /></AuthRoute>} />
              <Route path="/register"       element={<AuthRoute><Register /></AuthRoute>} />
              <Route path="/verify-otp"     element={<OTPVerify />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password"  element={<ResetPassword />} />

              {/* ── PROTECTED WORKSPACE (Navbar + Sidebar shell) ── */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              >
                {/* /app → redirect to correct role dashboard */}
                <Route index element={<DashboardRedirect />} />
                <Route path="dashboard" element={<DashboardRedirect />} />
              </Route>

              {/* ── ADMIN ROUTES ── */}
              <Route path="/admin">
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Home><AdminDashboard activeSubTab="dashboard" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="donors" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Home><AdminDonorsList /></Home>
                  </ProtectedRoute>
                } />
                <Route path="hospitals" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Home><AdminHospitalsList /></Home>
                  </ProtectedRoute>
                } />
                <Route path="inventory" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Home><AdminInventoryList /></Home>
                  </ProtectedRoute>
                } />
                <Route path="requests" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Home><AdminRequestsList /></Home>
                  </ProtectedRoute>
                } />
                <Route path="reports" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Home><ReportsView /></Home>
                  </ProtectedRoute>
                } />
                <Route path="logs" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Home><AdminDashboard activeSubTab="logs" /></Home>
                  </ProtectedRoute>
                } />
              </Route>

              {/* ── DONOR ROUTES ── */}
              <Route path="/donor">
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={
                  <ProtectedRoute allowedRoles={['Donor']}>
                    <Home><DonorDashboard activeSubTab="dashboard" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="blood-requests" element={
                  <ProtectedRoute allowedRoles={['Donor']}>
                    <Home><DonorDashboard activeSubTab="blood-requests" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="history" element={
                  <ProtectedRoute allowedRoles={['Donor']}>
                    <Home><DonorDashboard activeSubTab="history" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="profile" element={
                  <ProtectedRoute allowedRoles={['Donor']}>
                    <Home><DonorDashboard activeSubTab="profile" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="certificates" element={
                  <ProtectedRoute allowedRoles={['Donor']}>
                    <Home><DonorDashboard activeSubTab="certificates" /></Home>
                  </ProtectedRoute>
                } />
              </Route>

              {/* ── PATIENT ROUTES ── */}
              <Route path="/patient">
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={
                  <ProtectedRoute allowedRoles={['Patient']}>
                    <Home><PatientDashboard /></Home>
                  </ProtectedRoute>
                } />
                <Route path="search-donors" element={
                  <ProtectedRoute allowedRoles={['Patient']}>
                    <Home><BloodSearch /></Home>
                  </ProtectedRoute>
                } />
                <Route path="request-blood" element={
                  <ProtectedRoute allowedRoles={['Patient']}>
                    <Home><RequestBloodForm /></Home>
                  </ProtectedRoute>
                } />
                <Route path="nearby-search" element={
                  <ProtectedRoute allowedRoles={['Patient']}>
                    <Home><NearbySearch /></Home>
                  </ProtectedRoute>
                } />
              </Route>

              {/* ── HOSPITAL ROUTES ── */}
              <Route path="/hospital">
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={
                  <ProtectedRoute allowedRoles={['Hospital', 'Patient', 'Admin']}>
                    <Home><HospitalDashboard activeSubTab="dashboard" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="blood-requests" element={
                  <ProtectedRoute allowedRoles={['Hospital', 'Patient', 'Admin']}>
                    <Home><HospitalDashboard activeSubTab="blood-requests" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="request-blood" element={
                  <ProtectedRoute allowedRoles={['Hospital', 'Patient', 'Admin']}>
                    <Home><RequestBloodForm /></Home>
                  </ProtectedRoute>
                } />
                <Route path="stock-check" element={
                  <ProtectedRoute allowedRoles={['Hospital', 'Patient', 'Admin']}>
                    <Home><HospitalDashboard activeSubTab="stock-check" /></Home>
                  </ProtectedRoute>
                } />
              </Route>

              {/* ── BLOOD BANK STAFF ROUTES ── */}
              <Route path="/staff">
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={
                  <ProtectedRoute allowedRoles={['Blood Bank Staff']}>
                    <Home><StaffDashboard activeTab="dashboard" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="inventory" element={
                  <ProtectedRoute allowedRoles={['Blood Bank Staff']}>
                    <Home><StaffDashboard activeTab="inventory" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="add-inventory" element={
                  <ProtectedRoute allowedRoles={['Blood Bank Staff']}>
                    <Home><StaffDashboard activeTab="add-inventory" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="collection" element={
                  <ProtectedRoute allowedRoles={['Blood Bank Staff']}>
                    <Home><StaffDashboard activeTab="collection" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="testing" element={
                  <ProtectedRoute allowedRoles={['Blood Bank Staff']}>
                    <Home><StaffDashboard activeTab="testing" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="expiry" element={
                  <ProtectedRoute allowedRoles={['Blood Bank Staff']}>
                    <Home><StaffDashboard activeTab="expiry" /></Home>
                  </ProtectedRoute>
                } />
                <Route path="reports" element={
                  <ProtectedRoute allowedRoles={['Blood Bank Staff']}>
                    <Home><ReportsView /></Home>
                  </ProtectedRoute>
                } />
                <Route path="blood-requests" element={
                  <ProtectedRoute allowedRoles={['Blood Bank Staff']}>
                    <Home><StaffDashboard activeTab="blood-requests" /></Home>
                  </ProtectedRoute>
                } />
              </Route>

              {/* ── FALLBACK: unknown paths → landing page ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
