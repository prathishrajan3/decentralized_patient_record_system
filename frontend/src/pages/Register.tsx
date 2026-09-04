import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'patient',
    license_number: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await fetchApi('/users/register', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          license_number: formData.role === 'doctor' ? formData.license_number : undefined
        })
      });

      // Automatically login after successful registration
      const loginData = new URLSearchParams();
      loginData.append('username', formData.email);
      loginData.append('password', formData.password);

      const data = await fetchApi('/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginData
      });

      localStorage.setItem('access_token', data.access_token);
      
      if (formData.role === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/patient');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[--color-accent-light] rounded-full blur-[120px] opacity-50 -z-10 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[--color-primary-light] rounded-full blur-[120px] opacity-40 -z-10"></div>

      <div className="glass-panel w-full max-w-md p-8 sm:p-10 z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[--color-primary] to-[--color-accent] rounded-2xl mx-auto mb-5 shadow-[0_8px_16px_rgba(14,165,233,0.3)] flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Create Identity</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Join the Decentralized Patient Record System</p>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-start gap-3 shadow-sm">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input-field" placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required className="input-field" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required className="input-field" placeholder="••••••••" minLength={6} />
          </div>
          
          <div className="pt-2">
            <label className="block text-sm font-semibold text-slate-700 mb-3">I am a...</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`border-2 rounded-xl p-4 flex flex-col items-center cursor-pointer transition-all ${formData.role === 'patient' ? 'border-[--color-primary] bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white/60 hover:bg-slate-50'}`}>
                <input type="radio" name="role" value="patient" checked={formData.role === 'patient'} onChange={handleChange} className="sr-only" />
                <span className="font-semibold text-slate-700">Patient</span>
              </label>
              <label className={`border-2 rounded-xl p-4 flex flex-col items-center cursor-pointer transition-all ${formData.role === 'doctor' ? 'border-[--color-primary] bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white/60 hover:bg-slate-50'}`}>
                <input type="radio" name="role" value="doctor" checked={formData.role === 'doctor'} onChange={handleChange} className="sr-only" />
                <span className="font-semibold text-slate-700">Doctor</span>
              </label>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full btn-primary mt-6 py-3 text-lg">
            {loading ? 'Creating Identity...' : 'Register'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-200/50">
          <p className="text-center text-sm text-slate-600">
            Already have an identity? <Link to="/login" className="text-[--color-primary-light] font-semibold hover:text-[--color-primary] hover:underline transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
