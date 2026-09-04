import { useEffect, useState, useRef } from 'react';
import { Search, CheckCircle2, Upload, Loader2, FileCheck, Users, ShieldAlert, Clock, Stethoscope } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface Record {
  id: number;
  file_type: string;
  created_at: string;
  patient_id: number;
  blockchain_tx_hash: string | null;
}

export default function DoctorDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [uploadPatientId, setUploadPatientId] = useState('');
  const [fileType, setFileType] = useState('Consultation Note');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    try {
      const data = await fetchApi('/records');
      setRecords(data);
    } catch (err) {
      console.error("Failed to fetch records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) {
      alert("Please select a file to upload");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('patient_id', uploadPatientId);
    formData.append('file_type', fileType);
    formData.append('file', fileInputRef.current.files[0]);

    try {
      await fetchApi('/records', {
        method: 'POST',
        body: formData,
      });
      alert('Record encrypted and uploaded successfully to Supabase and logged on Sepolia!');
      setUploadPatientId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchRecords(); // Refresh the list
    } catch (err: any) {
      alert(err.message || 'Upload failed. Check if patient has granted you consent.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-[--color-primary]" />
        </div>
        <p className="text-slate-500 font-medium">Loading provider dashboard...</p>
      </div>
    );
  }

  const filteredRecords = records.filter(r => 
    r.patient_id.toString().includes(searchQuery) || 
    r.file_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Provider Dashboard</h2>
          </div>
          <p className="text-slate-500 font-medium text-sm">Manage your authorized patients and securely upload new medical records.</p>
        </div>
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            placeholder="Search Patient ID or Record Type..."
            className="w-full bg-white/80 border border-slate-200 shadow-sm rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[--color-primary-light]/20 focus:border-[--color-primary-light] transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -z-10 group-hover:scale-150 transition-transform duration-700"></div>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100/50 border border-blue-200 rounded-xl flex items-center justify-center shrink-0">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Secure Upload</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Upload records for patients who have granted you access.</p>
            </div>
          </div>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Patient ID</label>
                <input 
                  type="number" 
                  placeholder="e.g. 1" 
                  required
                  value={uploadPatientId}
                  onChange={e => setUploadPatientId(e.target.value)}
                  className="input-field py-2.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Record Type</label>
                <input 
                  type="text" 
                  placeholder="e.g. MRI Scan" 
                  required
                  value={fileType}
                  onChange={e => setFileType(e.target.value)}
                  className="input-field py-2.5"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Document</label>
              <input 
                type="file" 
                required
                ref={fileInputRef}
                className="w-full text-sm text-slate-600 bg-white/60 border border-slate-200 rounded-xl p-1.5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
              />
            </div>
            
            <button type="submit" disabled={uploading} className="w-full btn-primary mt-4 py-3">
              {uploading ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Encrypting & Uploading...</span>
              ) : (
                'Encrypt & Log to Blockchain'
              )}
            </button>
          </form>
        </div>

        <div className="glass-panel p-6 sm:p-8 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-100 rounded-full flex items-center justify-center mb-5 relative">
            <div className="absolute inset-0 border border-emerald-200 rounded-full animate-ping opacity-20"></div>
            <FileCheck className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Consent Verification Engine</h3>
          <p className="text-sm text-slate-500 font-medium mt-3 max-w-xs leading-relaxed">
            Access to patient data is strictly governed by smart contracts. Patients must explicitly grant your Doctor ID access via their portal.
          </p>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Authorized Patient Records</h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
            <Users className="w-3.5 h-3.5" /> {records.length} Total
          </span>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-4 px-6">Record ID</th>
                <th className="py-4 px-6">Patient ID</th>
                <th className="py-4 px-6">Document Type</th>
                <th className="py-4 px-6">Upload Date</th>
                <th className="py-4 px-6">Blockchain Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 hover:bg-white/80 transition-colors group">
                  <td className="py-4 px-6 text-sm font-bold text-slate-700">#{record.id}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                      {record.patient_id}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm font-semibold text-slate-800">{record.file_type}</td>
                  <td className="py-4 px-6 text-sm text-slate-500 font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {new Date(record.created_at).toLocaleDateString()}
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
                </tr>
              ))}
              
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShieldAlert className="w-10 h-10 text-slate-300 mb-3" />
                      <p className="text-slate-600 font-semibold">No authorized records found</p>
                      <p className="text-sm text-slate-500 mt-1">Try adjusting your search or wait for patient consent.</p>
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
