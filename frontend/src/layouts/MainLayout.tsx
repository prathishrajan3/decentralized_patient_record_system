import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, FileText, LogOut, Search, Clock } from 'lucide-react';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine role based on route for mock UI purposes
  const isDoctor = location.pathname.includes('/doctor');

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 glass-panel m-4 flex flex-col hidden md:flex border-r-0">
        <div className="p-6 flex items-center gap-3 border-b border-white/20">
          <div className="w-10 h-10 bg-gradient-to-br from-[--color-primary] to-[--color-accent] rounded-xl flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">Decentralized</h1>
            <p className="text-xs text-slate-500">Health Records</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {isDoctor ? (
            <>
              <Link to="/doctor" className="flex items-center gap-3 px-4 py-3 bg-white/60 text-[--color-primary] font-medium rounded-lg shadow-sm">
                <Users className="w-5 h-5" /> Patient Access
              </Link>
              <Link to="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-white/40 hover:text-[--color-primary] font-medium rounded-lg transition-colors">
                <Search className="w-5 h-5" /> Search Records
              </Link>
            </>
          ) : (
            <>
              <Link to="/patient" className="flex items-center gap-3 px-4 py-3 bg-white/60 text-[--color-primary] font-medium rounded-lg shadow-sm">
                <FileText className="w-5 h-5" /> My Records
              </Link>
              <Link to="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-white/40 hover:text-[--color-primary] font-medium rounded-lg transition-colors">
                <Shield className="w-5 h-5" /> Consent Management
              </Link>
              <Link to="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-white/40 hover:text-[--color-primary] font-medium rounded-lg transition-colors">
                <Clock className="w-5 h-5" /> Audit Trail
              </Link>
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-white/20">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-slate-600">{isDoctor ? 'DR' : 'JD'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{isDoctor ? 'Dr. Sarah Smith' : 'John Doe'}</p>
              <p className="text-xs text-slate-500 truncate">{isDoctor ? 'Cardiologist' : 'Patient'}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
