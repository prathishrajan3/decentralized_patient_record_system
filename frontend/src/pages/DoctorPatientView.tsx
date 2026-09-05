import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Clock, ShieldAlert, FileDown, Activity } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface Record {
  id: number;
  file_type: string;
  description?: string;
  created_at: string;
  patient_id: number;
  blockchain_tx_hash: string | null;
}

export default function DoctorPatientView() {
  const { id } = useParams<{ id: string }>();
  const [records, setRecords] = useState<Record[]>([]);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingRecordId, setDownloadingRecordId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsData, patientsData] = await Promise.all([
          fetchApi('/records'),
          fetchApi('/users/patients')
        ]);
        
        // Filter records for this specific patient
        const patientRecords = recordsData.filter((r: Record) => r.patient_id.toString() === id);
        setRecords(patientRecords);
        
        // Find patient info
        const patient = patientsData.find((p: any) => p.id.toString() === id);
        setPatientInfo(patient);
      } catch (err) {
        console.error("Failed to fetch patient data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const handleDownload = async (recordId: number) => {
    try {
      setDownloadingRecordId(recordId);
      
      const token = localStorage.getItem('access_token');
      // Fix: Don't hardcode backend URL, use relative or env-based
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/records/${recordId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Download failed');
      }
      
      // Get filename from Content-Disposition header if possible
      let filename = `record_${recordId}.enc`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename="([^"]*)"/.exec(disposition);
        if (matches != null && matches[1]) filename = matches[1];
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download record');
    } finally {
      setDownloadingRecordId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <p className="text-slate-500 font-medium">Loading patient records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/doctor" className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Patient Records</h2>
          </div>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Viewing records for {patientInfo ? patientInfo.full_name : `Patient #${id}`}
          </p>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">{patientInfo ? patientInfo.full_name : 'Patient'}'s Medical History</h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
            {records.length} Records Total
          </span>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-4 px-6">Record ID</th>
                <th className="py-4 px-6">Document Type</th>
                <th className="py-4 px-6">Upload Date</th>
                <th className="py-4 px-6">Blockchain Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 hover:bg-white/80 transition-colors group">
                  <td className="py-4 px-6 text-sm font-bold text-slate-700">#{record.id}</td>
                  <td className="py-4 px-6 text-sm font-semibold text-slate-800">
                    {record.file_type}
                    {record.description && (
                      <p className="text-xs text-slate-500 font-normal italic mt-1 max-w-xs break-words">"{record.description}"</p>
                    )}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {new Date(record.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm">
                    {record.blockchain_tx_hash ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified on Chain
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => handleDownload(record.id)}
                      disabled={downloadingRecordId === record.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg transition-colors border border-blue-200/60 disabled:opacity-50"
                    >
                      {downloadingRecordId === record.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileDown className="w-4 h-4" />
                      )}
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShieldAlert className="w-10 h-10 text-slate-300 mb-3" />
                      <p className="text-slate-600 font-semibold">No records found for this patient</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
