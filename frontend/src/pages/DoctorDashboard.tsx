import { useEffect, useState, useRef } from 'react';
import { Search, CheckCircle2, Upload, Loader2, FileCheck, Users, ShieldAlert, Clock, Stethoscope, UserPlus } from 'lucide-react';
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
  const [entryMode, setEntryMode] = useState('File'); // File, Prescription, Diagnosis, Observation
  const [fileType, setFileType] = useState('Consultation Note'); // For File
  
  // Clinical States
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [conditionName, setConditionName] = useState('');
  const [severity, setSeverity] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [observationType, setObservationType] = useState('');
  const [obsValue, setObsValue] = useState('');
  const [obsUnit, setObsUnit] = useState('');

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  
  // Emergency Access State
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
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
    if (!fileInputRef.current?.files?.[0]) {
      alert("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      if (entryMode === 'File') {
        const formData = new FormData();
        formData.append('patient_id', uploadPatientId);
        formData.append('file_type', fileType);
        formData.append('file', fileInputRef.current.files[0]);

        await fetchApi('/records', {
          method: 'POST',
          body: formData,
        });
        alert('Record encrypted and uploaded successfully!');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else if (entryMode === 'Prescription') {
        await fetchApi('/clinical/prescriptions', {
          method: 'POST',
          body: JSON.stringify({ patient_id: uploadPatientId, medication_name: medicationName, dosage, frequency, duration, notes: clinicalNotes })
        });
        alert('Prescription saved!');
      } else if (entryMode === 'Diagnosis') {
        await fetchApi('/clinical/diagnoses', {
          method: 'POST',
          body: JSON.stringify({ patient_id: uploadPatientId, condition_name: conditionName, severity, notes: clinicalNotes })
        });
        alert('Diagnosis saved!');
      } else if (entryMode === 'Observation') {
        await fetchApi('/clinical/observations', {
          method: 'POST',
          body: JSON.stringify({ patient_id: uploadPatientId, observation_type: observationType, value: obsValue, unit: obsUnit })
        });
        alert('Observation saved!');
      }
      setUploadPatientId('');
      fetchRecords(); // Refresh the list
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
    } catch (err: any) {
      alert(err.message || 'Failed to request consent');
    }
  };

  const handleEmergencyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setEmergencyJustification('');
      fetchRecords(); // Refresh to see new records if they were granted access
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

  const filteredRecords = records.filter(r => 
    r.patient_id.toString().includes(searchQuery) || 
    r.file_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPatients = patients.filter(p =>
    p.id.toString().includes(patientSearchQuery) ||
    p.full_name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(patientSearchQuery.toLowerCase())
  ).slice(0, 3); // Limit to 3 for compact UI

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
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search Records..."
              className="w-full bg-white/80 border border-slate-200 shadow-sm rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-[--color-primary-light]/20 focus:border-[--color-primary-light] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-2.5" />
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
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Patient ID</label>
                <input 
                  type="number" 
                  placeholder="e.g. 1" 
                  required
                  value={uploadPatientId}
                  onChange={e => setUploadPatientId(e.target.value)}
                  className="input-field py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Entry Type</label>
                <select value={entryMode} onChange={e => setEntryMode(e.target.value)} className="input-field py-2">
                  <option value="File">File Upload</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Diagnosis">Diagnosis</option>
                  <option value="Observation">Observation (Vitals)</option>
                </select>
              </div>
            </div>
            
            {entryMode === 'File' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Record Type</label>
                  <input type="text" placeholder="e.g. MRI Scan" required value={fileType} onChange={e => setFileType(e.target.value)} className="input-field py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Document</label>
                  <input type="file" required ref={fileInputRef} className="w-full text-sm text-slate-600 bg-white/60 border border-slate-200 rounded-xl p-1.5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
                </div>
              </>
            )}

            {entryMode === 'Prescription' && (
              <div className="space-y-3">
                <input type="text" placeholder="Medication Name" required value={medicationName} onChange={e=>setMedicationName(e.target.value)} className="input-field py-2" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Dosage (e.g. 50mg)" required value={dosage} onChange={e=>setDosage(e.target.value)} className="input-field py-2" />
                  <input type="text" placeholder="Freq (e.g. 2x/day)" required value={frequency} onChange={e=>setFrequency(e.target.value)} className="input-field py-2" />
                </div>
                <input type="text" placeholder="Duration (e.g. 7 days)" required value={duration} onChange={e=>setDuration(e.target.value)} className="input-field py-2" />
                <input type="text" placeholder="Notes" value={clinicalNotes} onChange={e=>setClinicalNotes(e.target.value)} className="input-field py-2" />
              </div>
            )}

            {entryMode === 'Diagnosis' && (
              <div className="space-y-3">
                <input type="text" placeholder="Condition Name" required value={conditionName} onChange={e=>setConditionName(e.target.value)} className="input-field py-2" />
                <input type="text" placeholder="Severity (Optional)" value={severity} onChange={e=>setSeverity(e.target.value)} className="input-field py-2" />
                <input type="text" placeholder="Clinical Notes" value={clinicalNotes} onChange={e=>setClinicalNotes(e.target.value)} className="input-field py-2" />
              </div>
            )}

            {entryMode === 'Observation' && (
              <div className="space-y-3">
                <input type="text" placeholder="Type (e.g. Blood Pressure)" required value={observationType} onChange={e=>setObservationType(e.target.value)} className="input-field py-2" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Value (e.g. 120/80)" required value={obsValue} onChange={e=>setObsValue(e.target.value)} className="input-field py-2" />
                  <input type="text" placeholder="Unit (e.g. mmHg)" value={obsUnit} onChange={e=>setObsUnit(e.target.value)} className="input-field py-2" />
                </div>
              </div>
            )}
            
            <button type="submit" disabled={uploading} className="w-full btn-primary mt-4 py-3">
              {uploading ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
              ) : (
                entryMode === 'File' ? 'Encrypt & Log to Blockchain' : 'Save Clinical Data'
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
            {patientSearchQuery && filteredPatients.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No patients found.</p>
            )}
            {patientSearchQuery && filteredPatients.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{p.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">ID: {p.id} • {p.email}</p>
                </div>
                <button onClick={() => handleRequestConsent(p.id)} className="w-full sm:w-auto px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold rounded-lg text-xs transition-colors shrink-0 border border-emerald-200">
                  Request Access
                </button>
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
                <p className="text-sm text-slate-500 mt-1">Bypass standard consent in critical situations. All actions are heavily audited and patients are notified immediately.</p>
              </div>
            </div>
            <form onSubmit={handleEmergencyAccess} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Patient ID</label>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 1"
                  className="input-field"
                  value={emergencyPatientId}
                  onChange={e => setEmergencyPatientId(e.target.value)}
                />
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
                <button type="submit" disabled={emergencyLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center">
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
