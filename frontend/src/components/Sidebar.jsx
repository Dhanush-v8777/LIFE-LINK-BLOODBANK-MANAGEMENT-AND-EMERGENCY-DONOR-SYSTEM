import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, User, History, PlusCircle, Search, 
  Database, PlusSquare, FileCheck2, ClipboardList, FileSpreadsheet, Settings, Bell, Heart, Award
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  // Define navigation lists depending on user roles
  const getNavLinks = () => {
    switch (user.roleName) {
      case 'Admin':
        return [
          { id: 'dashboard', label: 'Stats Analytics', icon: LayoutDashboard },
          { id: 'donors', label: 'Donor Registry', icon: User },
          { id: 'hospitals', label: 'Hospitals', icon: ClipboardList },
          { id: 'inventory', label: 'Blood Inventory', icon: Database },
          { id: 'requests', label: 'All Blood Requests', icon: History },
          { id: 'reports', label: 'Reports Export', icon: FileSpreadsheet },
          { id: 'logs', label: 'System Audit Logs', icon: Settings }
        ];
      case 'Donor':
        return [
          { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
          { id: 'blood-requests', label: 'Blood Requests', icon: Bell },
          { id: 'history', label: 'Donation History', icon: History },
          { id: 'certificates', label: 'Donation Certificates', icon: Award },
          { id: 'profile', label: 'Donor Profile Card', icon: User }
        ];
      case 'Patient':
        return [
          { id: 'dashboard', label: 'Track Requests', icon: LayoutDashboard },
          { id: 'search-donors', label: 'Find Donors', icon: Search },
          { id: 'request-blood', label: 'Request Blood', icon: PlusCircle }
        ];
      case 'Hospital':
        return [
          { id: 'dashboard', label: 'Hospital Dashboard', icon: LayoutDashboard },
          { id: 'blood-requests', label: 'Patient Blood Requests', icon: Heart },
          { id: 'request-blood', label: 'Place Blood Request', icon: PlusCircle },
          { id: 'stock-check', label: 'Regional Stocks', icon: Search }
        ];
      case 'Blood Bank Staff':
      case 'Blood Bank':
        return [
          { id: 'dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
          { id: 'inventory', label: 'Manage Stock', icon: Database },
          { id: 'add-inventory', label: 'Register Blood Unit', icon: PlusSquare },
          { id: 'collection', label: 'Record Collection', icon: PlusCircle },
          { id: 'testing', label: 'Blood Testing Logs', icon: FileCheck2 },
          { id: 'expiry', label: 'Expiry Controls', icon: ClipboardList },
          { id: 'reports', label: 'Excel & PDF Reports', icon: FileSpreadsheet },
          { id: 'blood-requests', label: 'Blood Requests', icon: Heart }
        ];
      default:
        return [];
    }
  };

  const getLinkPath = (linkId) => {
    const isStaff = /^blood\s*bank/i.test(user.roleName || '') || /^staff$/i.test(user.roleName || '');
    const rolePrefix = isStaff ? 'staff' : user.roleName.toLowerCase();
    return `/${rolePrefix}/${linkId}`;
  };

  const links = getNavLinks();

  return (
    <aside className="w-64 bg-slate-800 text-slate-300 min-h-screen flex flex-col shadow-lg border-r border-slate-700 select-none">
      {/* User Card */}
      <div className="p-5 border-b border-slate-700 bg-slate-900/40">
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Signed in as</p>
        <p className="font-bold text-sm text-slate-100 mt-1 truncate">{user.name}</p>
        <div className="inline-block px-2 py-0.5 mt-2 bg-brand-600/25 border border-brand-500/30 text-brand-400 text-[10px] font-bold rounded capitalize">
          {user.roleName}
        </div>
      </div>

      {/* Nav Menu Links */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const linkPath = getLinkPath(link.id);
          const isActive = location.pathname === linkPath;

          return (
            <button
              key={link.id}
              onClick={() => navigate(linkPath)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive 
                  ? 'bg-brand-600 text-white shadow-md' 
                  : 'hover:bg-slate-700/60 hover:text-slate-100 text-slate-400'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
