import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Users, FileText, CheckCircle, LogOut, Trash2, KeyRound, Loader2 } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
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

  const changePassword = async () => {
    try {
      setPasswordLoading(true);
      await fetchApi('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      alert("Password changed successfully!");
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
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

  const handleCleanup = async () => {
    if (!window.confirm('Are you absolutely sure you want to WIPE the entire database? This will delete all users, patients, doctors, records, and consents except for the admin account. This CANNOT BE UNDONE!')) {
      return;
    }
    
    if (window.prompt('Type "DELETE EVERYTHING" to confirm database wipe:') !== 'DELETE EVERYTHING') {
      alert("Cleanup cancelled.");
      return;
    }

    try {
      await fetchApi('/users/admin/cleanup', { method: 'DELETE' });
      alert("Database wiped successfully!");
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cleanup database');
      alert(err.message || 'Failed to cleanup database');
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
        <div className="flex gap-3">
          <button onClick={handleCleanup} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-xl transition-colors border border-red-100 shadow-sm">
            <Trash2 className="w-4 h-4" /> Wipe Database
          </button>
          <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-xl transition-colors border border-slate-200 shadow-sm bg-white">
            <KeyRound className="w-4 h-4" /> Change Password
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-xl transition-colors border border-slate-200 shadow-sm bg-white">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <KeyRound className="w-6 h-6 text-blue-500" />
                Change Password
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
                <input 
                  type="password" 
                  className="input-field"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                <input 
                  type="password" 
                  className="input-field"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <button 
                onClick={changePassword} 
                disabled={passwordLoading || !currentPassword || !newPassword} 
                className="btn-primary w-full py-2 mt-2"
              >
                {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Update Password"}
              </button>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {setShowPasswordModal(false); setCurrentPassword(''); setNewPassword('');}}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
