import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Users, FileText, CheckCircle, LogOut, Trash2 } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, recordsData, consentsData, pendingDocsData] = await Promise.all([
        fetchApi('/users'),
        fetchApi('/records'),
        fetchApi('/consent'),
        fetchApi('/users/doctors/pending')
      ]);
      setUsers(usersData);
      setRecords(recordsData);
      setConsents(consentsData);
      setPendingDoctors(pendingDocsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
      if (err.message.includes('401')) {
        navigate('/login');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user and all associated records? This action cannot be undone.')) {
      return;
    }
    try {
      await fetchApi(`/users/${userId}`, { method: 'DELETE' });
      // Reload data to reflect deletion across all tabs
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleVerifyDoctor = async (userId: number, status: string) => {
    try {
      await fetchApi(`/users/${userId}/verify?status=${status}`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update verification status');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 text-red-600">
          <div className="p-3 bg-red-50 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">System-wide monitoring</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('users')} 
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <Users className="w-5 h-5" /> Users ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('records')} 
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'records' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <FileText className="w-5 h-5" /> Records ({records.length})
        </button>
        <button 
          onClick={() => setActiveTab('consents')} 
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'consents' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <CheckCircle className="w-5 h-5" /> Consents ({consents.length})
        </button>
        <button 
          onClick={() => setActiveTab('verification')} 
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'verification' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <ShieldAlert className="w-5 h-5" /> Pending Doctors ({pendingDoctors.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">ID</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Email</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Full Name</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Role</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">License No.</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600">#{u.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{u.email}</td>
                    <td className="py-3 px-4 text-slate-600">{u.full_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'admin' ? 'bg-red-100 text-red-700' :
                        u.role === 'doctor' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{u.license_number || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Record ID</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Patient ID</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Doctor ID</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Type</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Blockchain TX</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600">#{r.id}</td>
                    <td className="py-3 px-4 text-slate-600">User #{r.patient_id}</td>
                    <td className="py-3 px-4 text-slate-600">Dr. #{r.doctor_id}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{r.file_type}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs font-mono">{r.blockchain_tx_hash || 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'consents' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Consent ID</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Patient ID</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Doctor ID</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Status</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Granted At</th>
                </tr>
              </thead>
              <tbody>
                {consents.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600">#{c.id}</td>
                    <td className="py-3 px-4 text-slate-600">User #{c.patient_id}</td>
                    <td className="py-3 px-4 text-slate-600">Dr. #{c.doctor_id}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{new Date(c.granted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Doctor ID</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Email</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Full Name</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">License No.</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingDoctors.map(d => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600">#{d.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{d.email}</td>
                    <td className="py-3 px-4 text-slate-600">{d.full_name}</td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">{d.license_number}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleVerifyDoctor(d.id, 'verified')}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleVerifyDoctor(d.id, 'rejected')}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingDoctors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No pending doctor verifications.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
