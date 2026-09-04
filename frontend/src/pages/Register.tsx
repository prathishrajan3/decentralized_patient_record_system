import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [license, setLicense] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await fetchApi('/users/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
          license_number: role === 'doctor' ? license : undefined
        })
      });

      // Automatically login after successful registration
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const data = await fetchApi('/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      localStorage.setItem('access_token', data.access_token);
      
      if (role === 'doctor') {
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Create Identity</h2>
          <p className="text-slate-500 text-sm mt-1">Join the decentralized network</p>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'patient' ? 'bg-white shadow text-[--color-primary]' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setRole('patient')}
            >
              Patient
            </button>
            <button 
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'doctor' ? 'bg-white shadow text-[--color-primary]' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setRole('doctor')}
            >
              Healthcare Provider
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full bg-white/60 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[--color-primary-light] transition-all" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-white/60 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[--color-primary-light] transition-all" placeholder="user@example.com" />
          </div>
          {role === 'doctor' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Medical License Number</label>
              <input type="text" value={license} onChange={e => setLicense(e.target.value)} required className="w-full bg-white/60 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[--color-primary-light] transition-all" placeholder="MD-12345678" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-white/60 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[--color-primary-light] transition-all" placeholder="••••••••" />
          </div>
          
          <button type="submit" disabled={loading} className="w-full btn-primary mt-4">{loading ? 'Processing...' : 'Register & Generate Keys'}</button>
        </form>
        
        <p className="text-center text-sm text-slate-600 mt-6">
          Already have an identity? <Link to="/login" className="text-[--color-primary] font-medium hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
