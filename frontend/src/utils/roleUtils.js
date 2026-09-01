/**
 * Utility to map any user role to their exact dashboard path.
 * Handles variations (e.g. "Blood Bank Staff" vs "Blood Bank", case sensitivity, extra whitespace).
 */
export const getDashboardPathForRole = (roleName) => {
  if (!roleName) return '/';
  const role = roleName.trim();
  if (/^admin$/i.test(role)) return '/admin/dashboard';
  if (/^donor$/i.test(role)) return '/donor/dashboard';
  if (/^patient$/i.test(role)) return '/patient/dashboard';
  if (/^hospital$/i.test(role)) return '/hospital/dashboard';
  if (/^blood\s*bank/i.test(role) || /^staff$/i.test(role)) return '/staff/dashboard';
  return '/';
};
