import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, FileText, Download, Loader2 } from 'lucide-react';
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
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-[--color-primary]" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Welcome back</h2>
          <p className="text-slate-500 mt-1">Here is the latest overview of your health records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Records</p>
              <h3 className="text-2xl font-bold text-slate-800">{records.length}</h3>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Consents</p>
              <h3 className="text-2xl font-bold text-slate-800">{consents.length}</h3>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Blockchain Verifications</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {records.filter(r => r.blockchain_tx_hash).length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Recent Medical Records</h3>
          </div>
          
          <div className="space-y-4">
            {records.length === 0 && <p className="text-sm text-slate-500">No medical records found.</p>}
            {records.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-white/50 border border-slate-100 rounded-xl hover:bg-white/80 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {record.blockchain_tx_hash ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">{record.file_type}</h4>
                    <p className="text-sm text-slate-500">Added by Dr. ID {record.doctor_id} on {new Date(record.created_at).toLocaleDateString()}</p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${record.blockchain_tx_hash ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {record.blockchain_tx_hash ? 'Verified on Sepolia' : 'Unverified'}
                    </span>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-[--color-primary] hover:bg-blue-50 rounded-lg transition-colors">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Active Consents</h3>
          <div className="space-y-4">
            {consents.length === 0 && <p className="text-sm text-slate-500">No active doctor consents.</p>}
            {consents.map((consent) => (
              <div key={consent.id} className="p-4 bg-white/50 border border-slate-100 rounded-xl">
                <h4 className="font-medium text-slate-800">Dr. ID: {consent.doctor_id}</h4>
                <p className="text-xs text-slate-500 mt-1">Granted on {new Date(consent.granted_at).toLocaleDateString()}</p>
                <div className="mt-3 flex justify-end">
                  <button onClick={() => handleRevoke(consent.doctor_id)} className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline">Revoke Access</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Activity(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
}
