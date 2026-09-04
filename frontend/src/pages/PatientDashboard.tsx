import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, FileText, Download, Loader2, Activity, User, FileHeart } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface Record {
  id: number;
  file_type: string;
  created_at: string;
  doctor_id: number;
  blockchain_tx_hash: string | null;
}

interface Consent {
  id: number;
  doctor_id: number;
  granted_at: string;
}

export default function PatientDashboard() {
  const [records, setRecords] = useState<Record[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsData, consentsData] = await Promise.all([
          fetchApi('/records'),
          fetchApi('/consent/active')
        ]);
        setRecords(recordsData);
        setConsents(consentsData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRevoke = async (doctorId: number) => {
    try {
      await fetchApi(`/consent/revoke/${doctorId}`, { method: 'POST' });
      setConsents(consents.filter(c => c.doctor_id !== doctorId));
    } catch (err) {
      alert("Failed to revoke consent");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-[--color-primary]" />
        </div>
        <p className="text-slate-500 font-medium">Loading your health portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Welcome back</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm">Here is the latest overview of your health records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl shadow-inner border border-blue-100">
              <FileHeart className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Records</p>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">{records.length}</h3>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-inner border border-emerald-100">
              <User className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Consents</p>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">{consents.length}</h3>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner border border-indigo-100">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Verifications</p>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                {records.filter(r => r.blockchain_tx_hash).length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">Recent Medical Records</h3>
            <button className="text-sm font-semibold text-[--color-primary-light] hover:text-[--color-primary] transition-colors">View All</button>
          </div>
          
          <div className="space-y-4">
            {records.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="text-slate-700 font-semibold mb-1">No medical records yet</h4>
                <p className="text-sm text-slate-500 max-w-sm">When doctors upload your health records or test results, they will securely appear here.</p>
              </div>
            )}
            
            {records.map((record) => (
              <div key={record.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/60 hover:bg-white border border-slate-200/60 rounded-xl transition-all shadow-sm hover:shadow-md">
                <div className="flex items-start gap-4 mb-4 sm:mb-0">
                  <div className="mt-1 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    {record.blockchain_tx_hash ? (
                      <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="w-6 h-6 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{record.file_type}</h4>
                    <p className="text-sm text-slate-500 font-medium">Added by Dr. ID {record.doctor_id} • {new Date(record.created_at).toLocaleDateString()}</p>
                    <span className={`inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 text-xs font-bold rounded-md ${record.blockchain_tx_hash ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${record.blockchain_tx_hash ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      {record.blockchain_tx_hash ? 'Verified on Sepolia' : 'Unverified'}
                    </span>
                  </div>
                </div>
                <button className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:text-[--color-primary] hover:border-[--color-primary-light]/30 hover:bg-blue-50 transition-all shadow-sm">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Active Consents</h3>
          <div className="space-y-4">
            {consents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <ShieldAlert className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-slate-700 font-semibold mb-1">No active consents</h4>
                <p className="text-xs text-slate-500">You haven't granted any doctor access to your records yet.</p>
              </div>
            )}
            
            {consents.map((consent) => (
              <div key={consent.id} className="p-5 bg-white/60 border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    DR
                  </div>
                  <h4 className="font-bold text-slate-800">Doctor #{consent.doctor_id}</h4>
                </div>
                <p className="text-xs font-medium text-slate-500 ml-11">Granted on {new Date(consent.granted_at).toLocaleDateString()}</p>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button onClick={() => handleRevoke(consent.doctor_id)} className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                    Revoke Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
