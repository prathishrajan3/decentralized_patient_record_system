
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, FileText, LogOut, Search, Clock } from 'lucide-react';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine role based on route for mock UI purposes
  const isDoctor = location.pathname.includes('/doctor');

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      {/* Sidebar */}
      <aside className="w-64 glass-panel m-4 flex-col hidden md:flex border-r-0 shadow-lg shadow-blue-900/5 relative overflow-hidden">
        {/* Subtle decorative glow in sidebar */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[--color-primary-light]/10 to-transparent pointer-events-none"></div>
        
        <div className="p-6 flex items-center gap-3 border-b border-slate-200/50 z-10">
          <div className="w-10 h-10 bg-gradient-to-br from-[--color-primary] to-[--color-accent] rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">Decentralized</h1>
            <p className="text-xs font-medium text-slate-500">Health Records</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 z-10">
          {isDoctor ? (
            <>
              <Link to="/doctor" className="flex items-center gap-3 px-4 py-3 bg-[--color-primary]/5 text-[--color-primary] font-semibold rounded-xl shadow-sm border border-[--color-primary]/10 transition-all">
                <Users className="w-5 h-5" /> Patient Access
              </Link>
              <Link to="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 hover:text-[--color-primary] font-medium rounded-xl transition-all">
                <Search className="w-5 h-5" /> Search Records
              </Link>
            </>
          ) : (
            <>
              <Link to="/patient" className="flex items-center gap-3 px-4 py-3 bg-[--color-primary]/5 text-[--color-primary] font-semibold rounded-xl shadow-sm border border-[--color-primary]/10 transition-all">
                <FileText className="w-5 h-5" /> My Records
              </Link>
              <Link to="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 hover:text-[--color-primary] font-medium rounded-xl transition-all">
                <Shield className="w-5 h-5" /> Consent Management
              </Link>
              <Link to="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 hover:text-[--color-primary] font-medium rounded-xl transition-all">
                <Clock className="w-5 h-5" /> Audit Trail
              </Link>
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-200/50 z-10 bg-white/40">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/60 border border-white shadow-sm mb-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-full flex items-center justify-center shadow-inner border border-slate-200/60">
              <span className="text-sm font-bold text-slate-600">{isDoctor ? 'DR' : 'JD'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{isDoctor ? 'Dr. Sarah Smith' : 'John Doe'}</p>
              <p className="text-xs font-medium text-slate-500 truncate">{isDoctor ? 'Cardiologist' : 'Patient'}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold rounded-xl transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
