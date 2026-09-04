import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      if (showMfa && mfaCode) {
        formData.append('mfa_code', mfaCode);
      }

      const data = await fetchApi('/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      localStorage.setItem('access_token', data.access_token);
      
      // Decode JWT slightly to find role for routing
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      
      if (payload.role === 'admin') {
        navigate('/admin');
      } else if (payload.role === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/patient');
      }
    } catch (err: any) {
      if (err.message === 'MFA_REQUIRED') {
        setShowMfa(true);
        setError('Please enter your multi-factor authentication code.');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[--color-accent-light] rounded-full blur-[120px] opacity-50 -z-10 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[--color-primary-light] rounded-full blur-[120px] opacity-40 -z-10"></div>
      
      <div className="glass-panel w-full max-w-md p-8 sm:p-10 z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[--color-primary] to-[--color-accent] rounded-2xl mx-auto mb-5 shadow-[0_8px_16px_rgba(14,165,233,0.3)] flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Secure Access</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Decentralized Patient Record System</p>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-start gap-3 shadow-sm">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>}

        <form onSubmit={handleLogin} className="space-y-6">
          {!showMfa ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email or Username</label>
                <input type="text" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-field" placeholder="••••••••" />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Authentication Code</label>
              <input type="text" value={mfaCode} onChange={e => setMfaCode(e.target.value)} required className="input-field tracking-widest text-center text-xl font-mono" placeholder="000000" maxLength={6} />
              <button type="button" onClick={() => setShowMfa(false)} className="text-xs text-slate-500 hover:text-slate-700 mt-2 block w-full text-center">Back to login</button>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full btn-primary mt-4 py-3 text-lg">
            {loading ? 'Authenticating...' : (showMfa ? 'Verify Code' : 'Sign In')}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-200/50">
          <p className="text-center text-sm text-slate-600">
            Don't have an identity yet? <Link to="/register" className="text-[--color-primary-light] font-semibold hover:text-[--color-primary] hover:underline transition-colors">Create Identity</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
