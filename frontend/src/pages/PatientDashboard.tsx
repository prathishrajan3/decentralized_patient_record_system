import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, FileText, Download, Loader2, Activity, User, FileHeart, Bell, Upload, X } from 'lucide-react';
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

interface PendingRequest {
  id: number;
  doctor_id: number;
  doctor_name: string;
  created_at: string;
}

export default function PatientDashboard() {
  const [records, setRecords] = useState<Record[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [clinicalData, setClinicalData] = useState<any>({ prescriptions: [], diagnoses: [], observations: [] });
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState('General Health Record');
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await fetchApi('/users/me');
        setUser(userData);
        const [recordsData, consentsData, requestsData, clinData] = await Promise.all([
          fetchApi('/records'),
          fetchApi('/consent/active'),
          fetchApi('/consent/requests/pending'),
          fetchApi('/clinical/patient-data').catch(() => ({ prescriptions: [], diagnoses: [], observations: [] }))
        ]);
        setRecords(recordsData);
        setConsents(consentsData);
        setPendingRequests(requestsData);
        setClinicalData(clinData);
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

  const handleApproveRequest = async (requestId: number) => {
    try {
      await fetchApi(`/consent/requests/${requestId}/approve`, { method: 'POST' });
      setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
      // Refresh consents
      const consentsData = await fetchApi('/consent/active');
      setConsents(consentsData);
    } catch (err) {
      alert("Failed to approve request");
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await fetchApi(`/consent/requests/${requestId}/reject`, { method: 'POST' });
      setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
    } catch (err) {
      alert("Failed to reject request");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !user) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('patient_id', user.id.toString());
      formData.append('file_type', uploadType);
      formData.append('file', uploadFile);

      await fetchApi('/records', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header so browser sets multipart/form-data with boundary
      });
      setIsUploadModalOpen(false);
      setUploadFile(null);
      // Refresh records
      const recordsData = await fetchApi('/records');
      setRecords(recordsData);
    } catch (err: any) {
      alert(err.message || "Failed to upload record");
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
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            onClick={async () => {
              try {
                const bundle = await fetchApi(`/fhir/v4/Observation?patient=${user.id}`);
                const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fhir_observations_${user.id}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              } catch (e: any) {
                alert("Failed to export FHIR data: " + e.message);
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" /> Export FHIR
          </button>
          <button 
            onClick={async () => {
              try {
                const data = await fetchApi('/records/export');
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `full_history_${user.id}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              } catch (e: any) {
                alert("Failed to export history: " + e.message);
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" /> Export Full History
          </button>
          <button onClick={() => setIsUploadModalOpen(true)} className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-2.5 px-5 shadow-sm">
            <Upload className="w-5 h-5" /> Upload Record
          </button>
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
                    <p className="text-sm text-slate-500 font-medium">{record.doctor_id ? `Added by Dr. ID ${record.doctor_id}` : 'Uploaded by You'} • {new Date(record.created_at).toLocaleDateString()}</p>
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

          <div className="mt-8 border-t border-slate-200/50 pt-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Clinical Data (Structured)</h3>
            
            <div className="space-y-6">
              {/* Prescriptions */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Prescriptions</h4>
                {clinicalData.prescriptions?.length === 0 ? <p className="text-sm text-slate-500">No prescriptions found.</p> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {clinicalData.prescriptions?.map((p: any) => (
                      <div key={p.id} className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                        <p className="font-bold text-slate-800">{p.medication_name}</p>
                        <p className="text-sm text-slate-600 mt-1">{p.dosage} - {p.frequency} for {p.duration}</p>
                        {p.notes && <p className="text-xs text-slate-500 mt-2 border-t border-blue-200/50 pt-2">{p.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diagnoses */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><FileHeart className="w-4 h-4 text-emerald-500" /> Diagnoses</h4>
                {clinicalData.diagnoses?.length === 0 ? <p className="text-sm text-slate-500">No diagnoses found.</p> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {clinicalData.diagnoses?.map((d: any) => (
                      <div key={d.id} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                        <p className="font-bold text-slate-800">{d.condition_name}</p>
                        {d.severity && <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">{d.severity}</span>}
                        {d.notes && <p className="text-xs text-slate-500 mt-2 border-t border-emerald-200/50 pt-2">{d.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observations */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500" /> Vitals & Observations</h4>
                {clinicalData.observations?.length === 0 ? <p className="text-sm text-slate-500">No observations found.</p> : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {clinicalData.observations?.map((o: any) => (
                      <div key={o.id} className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-center">
                        <p className="text-xs text-slate-500 uppercase font-semibold">{o.observation_type}</p>
                        <p className="font-bold text-slate-800 text-lg mt-1">{o.value} <span className="text-xs font-normal text-slate-500">{o.unit}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-8 space-y-8">
          {pendingRequests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-slate-800">Pending Requests</h3>
                <span className="flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{pendingRequests.length}</span>
              </div>
              <div className="space-y-4">
                {pendingRequests.map(req => (
                  <div key={req.id} className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm">Dr. {req.doctor_name}</h4>
                        <p className="text-xs text-slate-500">Requested access to your records</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-200/30">
                      <button onClick={() => handleApproveRequest(req.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-sm transition-colors">
                        Approve
                      </button>
                      <button onClick={() => handleRejectRequest(req.id)} className="flex-1 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 font-semibold py-1.5 px-3 rounded-lg text-sm transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Active Consents</h3>
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

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Upload Health Record</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Record Type</label>
                <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent transition-all">
                  <option value="General Health Record">General Health Record</option>
                  <option value="Blood Test Results">Blood Test Results</option>
                  <option value="Prescription">Prescription</option>
                  <option value="X-Ray / Scan">X-Ray / Scan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">File</label>
                <input type="file" required onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[--color-primary] hover:file:bg-blue-100 transition-all" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={uploading || !uploadFile} className="w-full btn-primary py-3">
                  {uploading ? 'Encrypting & Uploading...' : 'Upload Securely'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
