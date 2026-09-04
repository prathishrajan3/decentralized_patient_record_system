import React, { useEffect, useState, useRef } from 'react';
import { Search, FileText, CheckCircle2, Upload, Loader2, FileCheck } from 'lucide-react';
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
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-[--color-primary]" /></div>;
  }

  const filteredRecords = records.filter(r => 
    r.patient_id.toString().includes(searchQuery) || 
    r.file_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Doctor Dashboard</h2>
          <p className="text-slate-500 mt-1">Manage your patients and upload encrypted records.</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search by Patient ID or Type..."
            className="w-full md:w-80 bg-white/60 border border-slate-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-light]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-[--color-primary]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Upload Patient Record</h3>
              <p className="text-sm text-slate-500">Must have active consent from patient.</p>
            </div>
          </div>
          
          <form onSubmit={handleUpload} className="space-y-3">
            <input 
              type="number" 
              placeholder="Patient ID (e.g. 1)" 
              required
              value={uploadPatientId}
              onChange={e => setUploadPatientId(e.target.value)}
              className="w-full bg-white/60 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary-light]"
            />
            <input 
              type="text" 
              placeholder="Record Type (e.g. Blood Test)" 
              required
              value={fileType}
              onChange={e => setFileType(e.target.value)}
              className="w-full bg-white/60 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary-light]"
            />
            <input 
              type="file" 
              required
              ref={fileInputRef}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[--color-primary] hover:file:bg-blue-100"
            />
            <button type="submit" disabled={uploading} className="w-full btn-primary mt-2">
              {uploading ? 'Encrypting & Uploading...' : 'Secure Upload'}
            </button>
          </form>
        </div>

        <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <FileCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Patient Consent Required</h3>
          <p className="text-sm text-slate-500 mt-2">Patients must login to their dashboard and grant access to your Doctor ID before you can view or upload records for them.</p>
        </div>
      </div>

      <div className="glass-panel p-6 mt-8">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Authorized Patient Records</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="pb-3 font-medium">Record ID</th>
                <th className="pb-3 font-medium">Patient ID</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Blockchain Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 hover:bg-white/40 transition-colors">
                  <td className="py-4 text-sm font-medium text-[--color-primary]">{record.id}</td>
                  <td className="py-4 text-sm font-medium text-slate-800">{record.patient_id}</td>
                  <td className="py-4 text-sm text-slate-800">{record.file_type}</td>
                  <td className="py-4 text-sm text-slate-500">{new Date(record.created_at).toLocaleDateString()}</td>
                  <td className="py-4 text-sm">
                    {record.blockchain_tx_hash ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Verified on Chain
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No authorized records found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
