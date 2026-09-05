import { useEffect, useState, useRef } from 'react';
import { Search, CheckCircle2, Upload, Loader2, FileCheck, Users, ShieldAlert, Stethoscope, UserPlus, ArrowRight } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface Record {
  id: number;
  file_type: string;
  created_at: string;
  patient_id: number;
  blockchain_tx_hash: string | null;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<Record[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [uploadPatientId, setUploadPatientId] = useState('');
  const [entryMode, setEntryMode] = useState('File Upload');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Search Dropdown State
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  
  // Emergency Access State
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencySearch, setEmergencySearch] = useState('');
  const [emergencyPatientId, setEmergencyPatientId] = useState('');
  const [emergencyJustification, setEmergencyJustification] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const fetchRecords = async () => {
    try {
      const [recordsData, patientsData] = await Promise.all([
        fetchApi('/records'),
        fetchApi('/users/patients')
      ]);
      setRecords(recordsData);
      setPatients(patientsData);
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
    if (!uploadPatientId) {
      alert("Please select a patient");
      return;
    }
    if (!fileInputRef.current?.files?.[0]) {
      alert("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('patient_id', uploadPatientId);
      formData.append('file_type', entryMode);
      formData.append('file', fileInputRef.current.files[0]);

      await fetchApi('/records', {
        method: 'POST',
        body: formData,
      });
      alert('Record encrypted and uploaded successfully!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadPatientId('');
      fetchRecords();
    } catch (err: any) {
      alert(err.message || 'Upload failed. Check if patient has granted you consent.');
    } finally {
      setUploading(false);
    }
  };

  const handleRequestConsent = async (patientId: number) => {
    try {
      const res = await fetchApi(`/consent/request/${patientId}`, { method: 'POST' });
      alert(res.message);
      setPatients(patients.map(pat => pat.id === patientId ? {...pat, consent_status: 'pending'} : pat));
    } catch (err: any) {
      alert(err.message || 'Failed to request consent');
    }
  };

  const handleEmergencyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyPatientId) {
      alert("Please select a patient from the search results");
      return;
    }
    setEmergencyLoading(true);
    try {
      const res = await fetchApi('/consent/emergency', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: parseInt(emergencyPatientId),
          justification: emergencyJustification
        })
      });
      alert(res.message);
      setShowEmergencyModal(false);
      setEmergencyPatientId('');
      setEmergencySearch('');
      setEmergencyJustification('');
      fetchRecords();
    } catch (err: any) {
      alert(err.message || 'Failed to request emergency access');
    } finally {
      setEmergencyLoading(false);
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

  // Patients the doctor has consent for
  const consentedPatients = patients.filter(p => p.consent_status === 'granted');
  
  // Dashboard Search: Filters authorized patients
  const dashboardFilteredPatients = consentedPatients.filter(p => 
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toString().includes(searchQuery)
  );

  // Request Access Search
  const accessSearchFilteredPatients = patients.filter(p =>
    p.id.toString().includes(patientSearchQuery) ||
    p.full_name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(patientSearchQuery.toLowerCase())
  ).slice(0, 3); // Limit to 3 for compact UI

  // Emergency Modal Search
  const emergencyFilteredPatients = emergencySearch ? patients.filter(p => 
    p.full_name.toLowerCase().includes(emergencySearch.toLowerCase()) || 
    p.id.toString().includes(emergencySearch)
  ).slice(0, 5) : [];

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
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64 z-20" ref={searchRef}>
            <input 
              type="text" 
              placeholder="Search Patients..."
              className="w-full bg-white/80 border border-slate-200 shadow-sm rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-[--color-primary-light]/20 focus:border-[--color-primary-light] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
            
            {/* Search Dropdown */}
            {isSearchFocused && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden">
                {dashboardFilteredPatients.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {dashboardFilteredPatients.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => navigate(`/doctor/patient/${p.id}`)}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <p className="font-bold text-slate-800 text-sm">{p.full_name}</p>
                        <p className="text-xs text-slate-500">ID: {p.id} • {p.email}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    No authorized patients match your search.
                  </div>
                )}
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowEmergencyModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold rounded-xl transition-colors shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" /> Emergency Access
          </button>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Patient Name</label>
                <select 
                  required
                  value={uploadPatientId}
                  onChange={e => setUploadPatientId(e.target.value)}
                  className="input-field py-2"
                >
                  <option value="" disabled>Select a patient</option>
                  {consentedPatients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} (ID: {p.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Entry Type</label>
                <select value={entryMode} onChange={e => setEntryMode(e.target.value)} className="input-field py-2">
                  <option value="File Upload">File Upload</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Diagnosis">Diagnosis</option>
                  <option value="Observation (Vitals)">Observation (Vitals)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Document (PDF/Image)</label>
              <input type="file" required ref={fileInputRef} className="w-full text-sm text-slate-600 bg-white/60 border border-slate-200 rounded-xl p-1.5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
            </div>
            
            <button type="submit" disabled={uploading} className="w-full btn-primary mt-4 py-3">
              {uploading ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading & Encrypting...</span>
              ) : (
                'Encrypt & Log to Blockchain'
              )}
            </button>
          </form>
        </div>

        <div className="glass-panel p-6 sm:p-8 flex flex-col relative overflow-hidden group">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-100/50 border border-emerald-200 rounded-xl flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Request Access</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Find patients to request access to their records.</p>
            </div>
          </div>
          
          <div className="relative mb-4">
            <input 
              type="text" 
              placeholder="Search by name, email or ID..."
              className="w-full bg-white/80 border border-slate-200 shadow-sm rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={patientSearchQuery}
              onChange={(e) => setPatientSearchQuery(e.target.value)}
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {patientSearchQuery && accessSearchFilteredPatients.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No patients found.</p>
            )}
            {patientSearchQuery && accessSearchFilteredPatients.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{p.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">ID: {p.id} • {p.email}</p>
                </div>
                {p.consent_status === 'granted' ? (
                  <span className="w-full sm:w-auto px-3 py-1.5 bg-blue-50 text-blue-600 font-semibold rounded-lg text-xs text-center border border-blue-200">
                    Access Granted
                  </span>
                ) : p.consent_status === 'pending' ? (
                  <span className="w-full sm:w-auto px-3 py-1.5 bg-amber-50 text-amber-600 font-semibold rounded-lg text-xs text-center border border-amber-200">
                    Pending...
                  </span>
                ) : (
                  <button onClick={() => handleRequestConsent(p.id)} className="w-full sm:w-auto px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold rounded-lg text-xs transition-colors shrink-0 border border-emerald-200">
                    Request Access
                  </button>
                )}
              </div>
            ))}
            {!patientSearchQuery && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <FileCheck className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 font-medium max-w-[200px]">
                  Search for a patient above to request consent.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Authorized Patients</h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
            <Users className="w-3.5 h-3.5" /> {dashboardFilteredPatients.length} Total
          </span>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-4 px-6">Patient ID</th>
                <th className="py-4 px-6">Patient Name</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6 text-center">Total Records</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dashboardFilteredPatients.map((patient) => {
                const patientRecordsCount = records.filter(r => r.patient_id === patient.id).length;
                return (
                  <tr key={patient.id} onClick={() => navigate(`/doctor/patient/${patient.id}`)} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group cursor-pointer">
                    <td className="py-4 px-6 text-sm font-bold text-slate-700">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                        {patient.id}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-800">{patient.full_name}</td>
                    <td className="py-4 px-6 text-sm text-slate-500">{patient.email}</td>
                    <td className="py-4 px-6 text-sm text-center font-medium">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs">{patientRecordsCount}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-600 font-semibold text-sm hover:bg-blue-50 rounded-lg transition-colors group-hover:bg-blue-50">
                        View Records <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {dashboardFilteredPatients.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShieldAlert className="w-10 h-10 text-slate-300 mb-3" />
                      <p className="text-slate-600 font-semibold">No authorized patients found</p>
                      <p className="text-sm text-slate-500 mt-1">Search for patients and request access to view their records.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Access Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border-t-4 border-red-500">
            <div className="p-6 border-b border-slate-100 flex items-start gap-3 bg-red-50/30">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0 mt-1">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Emergency Access</h3>
                <p className="text-sm text-slate-500 mt-1">Bypass standard consent in critical situations. All actions are audited.</p>
              </div>
            </div>
            <form onSubmit={handleEmergencyAccess} className="p-6 space-y-4 bg-white">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search Patient</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search by name..."
                    className="input-field pl-9"
                    value={emergencySearch}
                    onChange={e => {
                      setEmergencySearch(e.target.value);
                      setEmergencyPatientId(''); // reset selection if they type
                    }}
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                
                {emergencySearch && !emergencyPatientId && (
                  <div className="mt-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 divide-y divide-slate-100 shadow-inner">
                    {emergencyFilteredPatients.length > 0 ? emergencyFilteredPatients.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          setEmergencyPatientId(p.id.toString());
                          setEmergencySearch(`${p.full_name} (ID: ${p.id})`);
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors flex justify-between items-center"
                      >
                        <span className="font-semibold text-slate-700 text-sm">{p.full_name}</span>
                        <span className="text-xs text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded">ID: {p.id}</span>
                      </div>
                    )) : (
                      <div className="px-3 py-2 text-sm text-slate-500 text-center">No matching patients found.</div>
                    )}
                  </div>
                )}
                
                {emergencyPatientId && (
                  <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Patient selected (ID: {emergencyPatientId})
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Clinical Justification</label>
                <textarea 
                  required
                  placeholder="Describe the medical emergency..."
                  className="input-field min-h-[100px] resize-y"
                  value={emergencyJustification}
                  onChange={e => setEmergencyJustification(e.target.value)}
                ></textarea>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowEmergencyModal(false)} className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                  Cancel
                </button>
                <button type="submit" disabled={emergencyLoading || !emergencyPatientId} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center">
                  {emergencyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
