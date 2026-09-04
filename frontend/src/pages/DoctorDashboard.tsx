import { useState } from 'react';
import { Search, UserPlus, FileText, CheckCircle2 } from 'lucide-react';

export default function DoctorDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const mockPatients = [
    { id: 'PAT-1042', name: 'John Doe', age: 34, lastVisit: '2026-08-15', status: 'Access Granted' },
    { id: 'PAT-0891', name: 'Alice Smith', age: 28, lastVisit: '2026-07-22', status: 'Access Granted' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Doctor Dashboard</h2>
          <p className="text-slate-500 mt-1">Manage your patients and request record access.</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search patient by ID or name..."
            className="w-full md:w-80 bg-white/60 border border-slate-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-light]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-[--color-primary]" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Request New Patient Access</h3>
          <p className="text-sm text-slate-500 mt-2 mb-4">You need explicit consent from a patient before you can view their decentralized medical records.</p>
          <button className="btn-primary">Initiate Request</button>
        </div>

        <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Submit Medical Record</h3>
          <p className="text-sm text-slate-500 mt-2 mb-4">Upload a new document or add an observation to an authorized patient's record.</p>
          <button className="btn-secondary">Add Record</button>
        </div>
      </div>

      <div className="glass-panel p-6 mt-8">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Patients with Active Consent</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="pb-3 font-medium">Patient ID</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Age</th>
                <th className="pb-3 font-medium">Last Visit</th>
                <th className="pb-3 font-medium">Consent Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockPatients.map((patient) => (
                <tr key={patient.id} className="border-b border-slate-100 hover:bg-white/40 transition-colors">
                  <td className="py-4 text-sm font-medium text-[--color-primary]">{patient.id}</td>
                  <td className="py-4 text-sm font-medium text-slate-800">{patient.name}</td>
                  <td className="py-4 text-sm text-slate-500">{patient.age}</td>
                  <td className="py-4 text-sm text-slate-500">{patient.lastVisit}</td>
                  <td className="py-4 text-sm">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" /> {patient.status}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button className="text-sm font-medium text-[--color-primary] hover:underline">View Records</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {mockPatients.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No patients found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
