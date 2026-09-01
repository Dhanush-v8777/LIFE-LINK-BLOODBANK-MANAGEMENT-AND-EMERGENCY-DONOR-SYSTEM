import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { getDashboardPathForRole } from '../utils/roleUtils';
import {
  Heart, Droplets, ShieldCheck, ArrowRight,
  Activity, Users, Building2, Zap, ChevronDown, Star
} from 'lucide-react';

const STATS = [
  { label: 'Lives Saved', value: '12,400+', icon: Heart, color: 'text-red-600' },
  { label: 'Blood Units', value: '98,000+', icon: Droplets, color: 'text-blue-600' },
  { label: 'Active Donors', value: '34,200+', icon: Users, color: 'text-emerald-600' },
  { label: 'Blood Banks', value: '1,200+', icon: Building2, color: 'text-purple-600' },
];

const FEATURES = [
  {
    icon: Zap,
    color: 'bg-amber-100 text-amber-600',
    title: 'Real-Time Matching',
    desc: 'AI-powered donor matching finds compatible blood donors within seconds for any emergency.'
  },
  {
    icon: ShieldCheck,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Verified Network',
    desc: 'Every donor, blood bank and hospital is verified through multi-step authentication.'
  },
  {
    icon: Activity,
    color: 'bg-blue-100 text-blue-600',
    title: 'Live Inventory',
    desc: 'Blood banks update stock in real time. Patients see exactly what\'s available near them.'
  }
];

const ROLES = [
  { role: 'Patient', desc: 'Request blood, track status, get notified instantly', emoji: '🏥', path: '/register' },
  { role: 'Donor', desc: 'Save lives in your community, earn recognition', emoji: '💉', path: '/register' },
  { role: 'Blood Bank', desc: 'Manage inventory, respond to requests, run reports', emoji: '🏦', path: '/register' },
  { role: 'Hospital', desc: 'Coordinate blood supply across departments', emoji: '🏨', path: '/register' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  // If already logged in, redirect to their dashboard immediately
  useEffect(() => {
    if (user) {
      navigate(getDashboardPathForRole(user.roleName), { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-x-hidden">

      {/* ── NAVBAR ────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-md' : 'bg-transparent'
      }`}>
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Heart className="h-7 w-7 fill-current text-red-600 animate-pulse" />
            <span className="text-xl font-black tracking-tight">
              <span className="text-slate-800 dark:text-slate-100">Life</span>
              <span className="text-red-600">Link</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-red-600 transition">Features</a>
            <a href="#how-it-works" className="hover:text-red-600 transition">How It Works</a>
            <a href="#roles" className="hover:text-red-600 transition">Who It's For</a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-red-200 dark:hover:shadow-red-900/40 transition-all"
            >
              Get Started Free
            </button>
          </div>
        </nav>
      </header>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-red-950/20" />
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-200/40 dark:bg-red-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-rose-200/30 dark:bg-rose-900/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-100/20 dark:bg-red-950/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-full text-red-700 dark:text-red-400 text-xs font-bold mb-6">
            <Star className="h-3.5 w-3.5 fill-current" />
            India's Most Trusted Blood Management Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
            <span className="text-slate-900 dark:text-white">Every Drop</span>
            <br />
            <span className="bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">
              Saves a Life
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            LifeLink connects patients, donors, blood banks and hospitals in real time.
            Find blood in seconds, manage inventory intelligently, and respond to emergencies instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-base rounded-2xl shadow-lg shadow-red-200 dark:shadow-red-900/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <Heart className="h-5 w-5 fill-current" />
              Join LifeLink Now
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-base rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 hover:scale-105 transition-all duration-200"
            >
              Sign In to Dashboard
            </button>
          </div>

          {/* Scroll hint */}
          <div className="mt-16 flex flex-col items-center gap-2 text-slate-400 animate-bounce">
            <span className="text-xs font-semibold uppercase tracking-wider">Explore</span>
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────── */}
      <section className="relative bg-gradient-to-r from-red-600 to-rose-600 py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center text-white">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/20 mb-3 mx-auto">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-black">{value}</p>
              <p className="text-sm text-red-100 font-semibold mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
              Built for Every Emergency
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Powerful features designed to save lives when every second counts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="group p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl ${color} mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">How LifeLink Works</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">3 simple steps from request to delivery</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Submit a Request', desc: 'Patient or hospital submits a blood request with blood group and urgency level.', color: 'bg-red-600' },
              { step: '02', title: 'AI Matches Instantly', desc: 'System scans nearby blood banks and eligible donors. Emergency alerts sent in seconds.', color: 'bg-amber-500' },
              { step: '03', title: 'Blood is Delivered', desc: 'Blood bank staff fulfill the request, update status, and the patient is notified instantly.', color: 'bg-emerald-600' },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="relative text-center">
                <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full ${color} text-white font-black text-xl mb-4 shadow-lg`}>
                  {step}
                </div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg mb-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES / WHO IS IT FOR ─────────────────────────── */}
      <section id="roles" className="py-24 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Who Is LifeLink For?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">One platform. Every stakeholder in the blood supply chain.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROLES.map(({ role, desc, emoji }) => (
              <div key={role} className="group p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-center cursor-pointer" onClick={() => navigate('/register')}>
                <div className="text-4xl mb-4">{emoji}</div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg mb-2">{role}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-red-600 text-xs font-bold group-hover:gap-2 transition-all">
                  Register as {role} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-32 -translate-y-32" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-32 translate-y-32" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <Heart className="h-12 w-12 fill-current mx-auto mb-4 animate-pulse" />
          <h2 className="text-4xl font-black mb-4">Ready to Save Lives?</h2>
          <p className="text-red-100 text-lg mb-8">Join thousands of donors, patients and blood banks already using LifeLink.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="px-10 py-4 bg-white text-red-600 font-black rounded-2xl hover:bg-red-50 shadow-lg hover:scale-105 transition-all duration-200 text-base"
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-10 py-4 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl border border-white/30 hover:scale-105 transition-all duration-200 text-base"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Heart className="h-5 w-5 fill-current text-red-600" />
          <span className="text-white font-black text-lg">Life<span className="text-red-600">Link</span></span>
        </div>
        <p className="text-sm">Blood Bank Management & Emergency Matching System</p>
        <p className="text-xs mt-2 text-slate-600">&copy; 2026 LifeLink Systems. All rights reserved.</p>
      </footer>
    </div>
  );
}
