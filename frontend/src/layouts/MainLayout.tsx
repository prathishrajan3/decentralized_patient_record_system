import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, FileText, LogOut, Clock, Loader2, KeyRound } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, [location.pathname]); // Reload if route changes, just in case

  const loadUser = async () => {
    try {
      const data = await fetchApi('/users/me');
      setUser(data);
    } catch (err) {
      console.error("Failed to load user info:", err);
      // Don't auto-redirect here, let the protected route handle it
    }
  };

  const changePassword = async () => {
    try {
      setPasswordLoading(true);
      await fetchApi('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      alert("Password changed successfully!");
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Determine role based on route for UI purposes if user not loaded yet
  const isDoctor = user ? user.role === 'doctor' : location.pathname.includes('/doctor');

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
              <Link to="/doctor" className={`flex items-center gap-3 px-4 py-3 font-semibold rounded-xl transition-all ${location.pathname === '/doctor' ? 'bg-[--color-primary]/5 text-[--color-primary] shadow-sm border border-[--color-primary]/10' : 'text-slate-600 hover:bg-slate-100 hover:text-[--color-primary]'}`}>
                <Users className="w-5 h-5" /> Patient Access
              </Link>
            </>
          ) : (
            <>
              <Link to="/patient" className={`flex items-center gap-3 px-4 py-3 font-semibold rounded-xl transition-all ${location.pathname === '/patient' ? 'bg-[--color-primary]/5 text-[--color-primary] shadow-sm border border-[--color-primary]/10' : 'text-slate-600 hover:bg-slate-100 hover:text-[--color-primary]'}`}>
                <FileText className="w-5 h-5" /> Dashboard
              </Link>
              <Link to="/patient/consent" className={`flex items-center gap-3 px-4 py-3 font-semibold rounded-xl transition-all ${location.pathname === '/patient/consent' ? 'bg-[--color-primary]/5 text-[--color-primary] shadow-sm border border-[--color-primary]/10' : 'text-slate-600 hover:bg-slate-100 hover:text-[--color-primary]'}`}>
                <Shield className="w-5 h-5" /> Consent Management
              </Link>
              <Link to="/patient/audit" className={`flex items-center gap-3 px-4 py-3 font-semibold rounded-xl transition-all ${location.pathname === '/patient/audit' ? 'bg-[--color-primary]/5 text-[--color-primary] shadow-sm border border-[--color-primary]/10' : 'text-slate-600 hover:bg-slate-100 hover:text-[--color-primary]'}`}>
                <Clock className="w-5 h-5" /> Audit Trail
              </Link>
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-200/50 z-10 bg-white/40 mt-auto">
          <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-white/60 border border-white shadow-sm">
            <div className="w-9 h-9 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-full flex items-center justify-center shadow-inner border border-slate-200/60 shrink-0">
              <span className="text-sm font-bold text-slate-600">{user?.full_name ? user.full_name.substring(0,2).toUpperCase() : (isDoctor ? 'DR' : 'PT')}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate leading-tight">{user?.full_name || (isDoctor ? 'Doctor User' : 'Patient User')}</p>
              <p className="text-[10px] font-medium text-slate-500 truncate">{isDoctor ? `ID: ${user?.id || ''}` : `Patient ID: ${user?.id || ''}`}</p>
            </div>
            <div className="flex flex-col gap-0.5 shrink-0">
              <button 
                onClick={() => setShowPasswordModal(true)}
                title="Change Password"
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('access_token');
                  navigate('/login');
                }}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <KeyRound className="w-6 h-6 text-blue-500" />
                Change Password
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
                <input 
                  type="password" 
                  className="input-field"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                <input 
                  type="password" 
                  className="input-field"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <button 
                onClick={changePassword} 
                disabled={passwordLoading || !currentPassword || !newPassword} 
                className="btn-primary w-full py-2 mt-2"
              >
                {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Update Password"}
              </button>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {setShowPasswordModal(false); setCurrentPassword(''); setNewPassword('');}}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
