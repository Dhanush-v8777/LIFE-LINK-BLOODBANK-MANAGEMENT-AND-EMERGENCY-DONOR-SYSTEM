import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

/**
 * Authenticated workspace shell.
 * Wraps every protected page with Navbar + Sidebar + Footer.
 * Children are passed directly as props (no <Outlet>).
 */
export default function Home({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Menu */}
        <Sidebar />

        {/* Main Panel */}
        <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
