

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-6 px-8 text-center text-xs text-slate-500 dark:text-slate-400">
      <p>&copy; {new Date().getFullYear()} LifeLink Blood Bank & Emergency Matching System. All rights reserved.</p>
      <p className="mt-1 text-[10px] text-slate-400">Developed as an MCA Capstone Project.</p>
    </footer>
  );
}
