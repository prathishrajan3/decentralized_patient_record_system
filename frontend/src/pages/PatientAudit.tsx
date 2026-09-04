import { useEffect, useState } from 'react';
import { Clock, Loader2, FileText, CheckCircle, ShieldAlert, Upload } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface AuditLog {
  id: number;
  action: string;
  resource_id: string | null;
  timestamp: string;
}

export default function PatientAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchApi('/audit');
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionDetails = (action: string, resource_id: string | null) => {
    switch (action) {
      case 'UPLOAD_RECORD':
        return { icon: <Upload className="w-5 h-5 text-blue-500" />, text: `Uploaded a new record`, bg: 'bg-blue-50' };
      case 'GRANT_CONSENT':
      case 'APPROVE_CONSENT_REQUEST':
        return { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, text: `Granted consent to Doctor #${resource_id}`, bg: 'bg-emerald-50' };
      case 'REVOKE_CONSENT':
      case 'REJECT_CONSENT_REQUEST':
        return { icon: <ShieldAlert className="w-5 h-5 text-amber-500" />, text: `Revoked/Rejected consent for Doctor #${resource_id}`, bg: 'bg-amber-50' };
      case 'VIEW_OWN_RECORDS':
        return { icon: <FileText className="w-5 h-5 text-indigo-500" />, text: `Viewed your own records`, bg: 'bg-indigo-50' };
      default:
        return { icon: <Clock className="w-5 h-5 text-slate-500" />, text: `${action} (Resource: ${resource_id || 'N/A'})`, bg: 'bg-slate-50' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[--color-primary]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Audit Trail</h2>
        <p className="text-slate-500 mt-1 font-medium text-sm">A secure, chronological log of all activities related to your account.</p>
      </div>

      <div className="glass-panel p-6 sm:p-8">
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {logs.map((log) => {
            const { icon, text, bg } = getActionDetails(log.action, log.resource_id);
            return (
              <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${bg} shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2`}>
                  {icon}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 text-sm">{text}</span>
                  </div>
                  <time className="text-xs font-medium text-slate-500">{new Date(log.timestamp).toLocaleString()}</time>
                </div>
              </div>
            );
          })}
          
          {logs.length === 0 && (
            <p className="text-center text-slate-500 py-4 relative z-10 bg-slate-50 rounded-xl">No audit logs found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
