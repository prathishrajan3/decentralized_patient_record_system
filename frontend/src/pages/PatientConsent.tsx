import { useEffect, useState } from 'react';
import { Shield, Search, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function PatientConsent() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [doctorsData, consentsData] = await Promise.all([
        fetchApi('/users/doctors'),
        fetchApi('/consent/active')
      ]);
      setDoctors(doctorsData);
      setConsents(consentsData);
    } catch (err) {
      console.error("Failed to load consent data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantConsent = async (doctorId: number) => {
    try {
      await fetchApi(`/consent/grant/${doctorId}`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to grant consent");
    }
  };

  const handleRevokeConsent = async (doctorId: number) => {
    try {
      await fetchApi(`/consent/revoke/${doctorId}`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to revoke consent");
    }
  };

  const filteredDoctors = doctors.filter(d => 
    d.full_name.toLowerCase().includes(search.toLowerCase()) || 
    d.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[--color-primary]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Consent Management</h2>
        <p className="text-slate-500 mt-1 font-medium text-sm">Proactively manage which doctors have access to your records.</p>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-[--color-primary]" /> Find a Doctor
        </h3>
        <div className="relative mb-6">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search doctors by name or username..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[--color-primary] transition-all"
          />
        </div>

        <div className="space-y-3">
          {filteredDoctors.map(doctor => {
            const hasConsent = consents.some(c => c.doctor_id === doctor.id);
            return (
              <div key={doctor.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-800">Dr. {doctor.full_name}</h4>
                  <p className="text-sm text-slate-500">ID: {doctor.id} • License: {doctor.license_number || 'N/A'}</p>
                </div>
                {hasConsent ? (
                  <button onClick={() => handleRevokeConsent(doctor.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-semibold rounded-lg transition-colors">
                    <ShieldAlert className="w-4 h-4" /> Revoke Access
                  </button>
                ) : (
                  <button onClick={() => handleGrantConsent(doctor.id)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-[--color-primary] hover:bg-blue-100 font-semibold rounded-lg transition-colors">
                    <CheckCircle className="w-4 h-4" /> Grant Access
                  </button>
                )}
              </div>
            );
          })}
          {filteredDoctors.length === 0 && (
            <p className="text-center text-slate-500 py-4">No doctors found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
