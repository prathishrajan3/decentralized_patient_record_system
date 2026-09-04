
import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, FileText, LogOut, Search, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaData, setMfaData] = useState<{secret: string, provisioning_uri: string} | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

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

  const setupMfa = async () => {
    try {
      setMfaLoading(true);
      const data = await fetchApi('/users/mfa/setup', { method: 'POST' });
      setMfaData(data);
    } catch (err: any) {
      alert(err.message || "Failed to setup MFA");
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyMfa = async () => {
    try {
      setMfaLoading(true);
      await fetchApi('/users/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ mfa_code: mfaCode })
      });
      alert("MFA Successfully Verified!");
      setShowMfaModal(false);
      setMfaData(null);
      setMfaCode('');
    } catch (err: any) {
      alert(err.message || "Invalid MFA code");
    } finally {
      setMfaLoading(false);
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
              <Link to="/doctor/search" className={`flex items-center gap-3 px-4 py-3 font-semibold rounded-xl transition-all ${location.pathname === '/doctor/search' ? 'bg-[--color-primary]/5 text-[--color-primary] shadow-sm border border-[--color-primary]/10' : 'text-slate-600 hover:bg-slate-100 hover:text-[--color-primary]'}`}>
                <Search className="w-5 h-5" /> Search Patients
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
        
        <div className="p-4 border-t border-slate-200/50 z-10 bg-white/40">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/60 border border-white shadow-sm mb-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-full flex items-center justify-center shadow-inner border border-slate-200/60">
              <span className="text-sm font-bold text-slate-600">{user?.full_name ? user.full_name.substring(0,2).toUpperCase() : (isDoctor ? 'DR' : 'PT')}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.full_name || (isDoctor ? 'Doctor User' : 'Patient User')}</p>
              <p className="text-xs font-medium text-slate-500 truncate">{isDoctor ? `ID: ${user?.id || ''}` : `Patient ID: ${user?.id || ''}`}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowMfaModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition-colors border border-transparent hover:border-slate-200 mb-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Security (MFA)
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('access_token');
              navigate('/login');
            }}
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

      {/* MFA Modal */}
      {showMfaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                Two-Factor Authentication
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {!mfaData ? (
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-4">Enhance your account security by enabling Multi-Factor Authentication using an authenticator app (e.g. Google Authenticator, Authy).</p>
                  <button onClick={setupMfa} disabled={mfaLoading} className="btn-primary w-full py-2">
                    {mfaLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Set up MFA"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-slate-600">Scan this QR code in your authenticator app, or enter the secret manually:</p>
                  <div className="bg-slate-50 p-4 rounded-xl font-mono text-lg tracking-widest text-slate-800 break-all border border-slate-200">
                    {mfaData.secret}
                  </div>
                  <div className="mt-4">
                    <input 
                      type="text" 
                      placeholder="Enter 6-digit code"
                      className="input-field text-center text-xl tracking-widest font-mono"
                      maxLength={6}
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value)}
                    />
                  </div>
                  <button onClick={verifyMfa} disabled={mfaLoading || mfaCode.length !== 6} className="btn-primary w-full py-2 mt-4">
                    {mfaLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify & Enable"}
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {setShowMfaModal(false); setMfaData(null); setMfaCode('');}}
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
