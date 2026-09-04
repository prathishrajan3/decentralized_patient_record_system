import React from 'react';
import { ShieldCheck, ShieldAlert, FileText, Download } from 'lucide-react';

export default function PatientDashboard() {
  const mockRecords = [
    { id: 'REC-001', date: '2026-08-15', type: 'Blood Test Results', doctor: 'Dr. Sarah Smith', status: 'Verified' },
    { id: 'REC-002', date: '2026-07-22', type: 'Annual Physical', doctor: 'Dr. James Wilson', status: 'Verified' },
    { id: 'REC-003', date: '2026-05-10', type: 'Prescription - Amoxicillin', doctor: 'Dr. Emily Chen', status: 'Pending Verification' },
  ];

  const mockConsents = [
    { doctor: 'Dr. Sarah Smith', hospital: 'City General', grantedOn: '2026-01-15', expires: '2027-01-15' },
    { doctor: 'Dr. James Wilson', hospital: 'Westside Clinic', grantedOn: '2026-06-20', expires: '2026-12-20' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Welcome, John</h2>
          <p className="text-slate-500 mt-1">Here is the latest overview of your health records.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <FileText className="w-4 h-4" /> Add Record
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Records</p>
              <h3 className="text-2xl font-bold text-slate-800">24</h3>
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
              <h3 className="text-2xl font-bold text-slate-800">2</h3>
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
              <h3 className="text-2xl font-bold text-slate-800">23</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Records List */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Recent Medical Records</h3>
            <button className="text-sm font-medium text-[--color-primary] hover:underline">View All</button>
          </div>
          
          <div className="space-y-4">
            {mockRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-white/50 border border-slate-100 rounded-xl hover:bg-white/80 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {record.status === 'Verified' ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">{record.type}</h4>
                    <p className="text-sm text-slate-500">Added by {record.doctor} on {record.date}</p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${record.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {record.status}
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

        {/* Active Consents */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Active Consents</h3>
          <div className="space-y-4">
            {mockConsents.map((consent, idx) => (
              <div key={idx} className="p-4 bg-white/50 border border-slate-100 rounded-xl">
                <h4 className="font-medium text-slate-800">{consent.doctor}</h4>
                <p className="text-sm text-slate-500">{consent.hospital}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Expires: {consent.expires}</span>
                  <button className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline">Revoke</button>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 btn-secondary text-sm">Manage All Permissions</button>
        </div>
      </div>
    </div>
  );
}

// Mock Activity icon since I didn't import it at the top
function Activity(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
}
