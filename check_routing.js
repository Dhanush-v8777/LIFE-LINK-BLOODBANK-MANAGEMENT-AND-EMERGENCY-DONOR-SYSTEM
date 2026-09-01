const fs = require('fs');

const checks = [
  ['frontend/src/pages/LandingPage.jsx', ['Every Drop', 'navigate', 'LandingPage', 'useAuth']],
  ['frontend/src/pages/Home.jsx', ['children', 'Navbar', 'Sidebar', 'Footer']],
  ['frontend/src/App.jsx', ['LandingPage', 'AuthRoute', 'blood-requests', '/admin/dashboard']],
  ['frontend/src/components/ProtectedRoute.jsx', ['Navigate to=']],
  ['frontend/src/components/Navbar.jsx', ['useNavigate']],
  ['frontend/src/pages/Login.jsx', ['getDashboardPath', '/admin/dashboard', '/staff/dashboard']],
];

let allPass = true;
checks.forEach(([file, patterns]) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    patterns.forEach(p => {
      if (!content.includes(p)) {
        console.error('FAIL  ' + file + '  missing: ' + p);
        allPass = false;
      }
    });
    console.log('OK    ' + file + '  (' + content.split('\n').length + ' lines)');
  } catch(e) {
    console.error('MISS  ' + file);
    allPass = false;
  }
});
console.log(allPass ? '\n✅ All checks PASSED' : '\n❌ Some checks FAILED');
