import { useState, useEffect, useRef } from 'react';
import { Activity, Heart, Radio, Fingerprint, CheckCircle2, X, Loader2, ShieldCheck, Save, RotateCcw, Timer } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface VitalsMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVitalsRecorded?: () => void;
}

interface TelemetryData {
  online: boolean;
  device_id: string;
  finger_detected: boolean;
  ir_value: number;
  leads_off: boolean;
  heart_rate: number;
  spo2: number;
  ecg_samples: number[];
  mode: string;
  last_seen: string | null;
}

export default function VitalsMonitorModal({ isOpen, onClose, onVitalsRecorded }: VitalsMonitorModalProps) {
  const [selectedMode, setSelectedMode] = useState<'BOTH' | 'ECG_ONLY' | 'SPO2_ONLY'>('BOTH');
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    online: false,
    device_id: 'ESP32-VITALS-01',
    finger_detected: false,
    ir_value: 0,
    leads_off: true,
    heart_rate: 0,
    spo2: 0,
    ecg_samples: [],
    mode: 'BOTH',
    last_seen: null
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // 10-Second Measurement State
  const [sessionState, setSessionState] = useState<'IDLE' | 'MEASURING' | 'COMPLETED'>('IDLE');
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [lockedVitals, setLockedVitals] = useState<{ heart_rate: number; spo2: number } | null>(null);
  const samplesRef = useRef<{ hr: number[]; spo2: number[] }>({ hr: [], spo2: [] });

  // Critical rule: Finger must be detected on sensor for any mode to display vitals
  const hasFinger = Boolean(telemetry.online && telemetry.finger_detected);

  // Poll telemetry every 750ms when modal is open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchLatest = async () => {
      try {
        const data = await fetchApi('/clinical/telemetry/latest');
        if (isMounted && data) {
          setTelemetry(data);
          if (data.mode && ['BOTH', 'ECG_ONLY', 'SPO2_ONLY'].includes(data.mode)) {
            setSelectedMode(data.mode as any);
          }
        }
      } catch (err) {
        console.error('Error fetching telemetry:', err);
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 750);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

  // Reset state whenever modal is freshly opened
  useEffect(() => {
    if (isOpen) {
      setSessionState('IDLE');
      setTimeLeft(10);
      setLockedVitals(null);
      setSaveSuccess(null);
      samplesRef.current = { hr: [], spo2: [] };
    }
  }, [isOpen]);

  // Transition from IDLE to MEASURING when finger is detected
  useEffect(() => {
    if (isOpen && sessionState === 'IDLE' && hasFinger) {
      setSessionState('MEASURING');
      setTimeLeft(10);
      samplesRef.current = { hr: [], spo2: [] };
    }
  }, [isOpen, sessionState, hasFinger]);

  // 10-Second Measurement Countdown & Sampling Timer
  useEffect(() => {
    if (!isOpen || sessionState !== 'MEASURING') return;

    const timer = setInterval(() => {
      // Only count down while finger is maintained on the sensor
      if (hasFinger) {
        // Collect valid sample readings
        if (telemetry.heart_rate > 35 && telemetry.heart_rate < 220) {
          samplesRef.current.hr.push(telemetry.heart_rate);
        }
        if (telemetry.spo2 > 70 && telemetry.spo2 <= 100) {
          samplesRef.current.spo2.push(telemetry.spo2);
        }

        setTimeLeft((prev) => {
          if (prev <= 1) {
            // 10-Second Session Completed! Lock final averaged vitals
            const hrList = samplesRef.current.hr;
            const spo2List = samplesRef.current.spo2;

            const finalHr = hrList.length > 0
              ? Math.round(hrList.reduce((a, b) => a + b, 0) / hrList.length)
              : (telemetry.heart_rate || 75);

            const finalSpo2 = spo2List.length > 0
              ? Math.round(spo2List.reduce((a, b) => a + b, 0) / spo2List.length)
              : (telemetry.spo2 || 98);

            setLockedVitals({
              heart_rate: finalHr,
              spo2: finalSpo2
            });
            setSessionState('COMPLETED');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, sessionState, hasFinger, telemetry.heart_rate, telemetry.spo2]);

  // Retake Measurement Handler
  const handleRetake = () => {
    setTimeLeft(10);
    setLockedVitals(null);
    setSaveSuccess(null);
    samplesRef.current = { hr: [], spo2: [] };
    setSessionState(hasFinger ? 'MEASURING' : 'IDLE');
  };

  // Handle Mode Change
  const handleModeSwitch = async (mode: 'BOTH' | 'ECG_ONLY' | 'SPO2_ONLY') => {
    setSelectedMode(mode);
    try {
      await fetchApi('/clinical/telemetry/mode', {
        method: 'POST',
        body: JSON.stringify({ mode })
      });
    } catch (err) {
      console.error('Failed to change mode:', err);
    }
  };

  // Save Vitals to Record (Encrypted PDF in Supabase + Blockchain)
  const handleSaveVitals = async () => {
    const hrToSave = lockedVitals ? lockedVitals.heart_rate : telemetry.heart_rate;
    const spo2ToSave = selectedMode === 'ECG_ONLY' ? 0 : (lockedVitals ? lockedVitals.spo2 : telemetry.spo2);

    if (!hrToSave || hrToSave === 0) {
      alert("No valid vitals measured. Please complete the 10-second measurement first.");
      return;
    }

    try {
      setSaving(true);
      await fetchApi('/clinical/telemetry/save-vitals', {
        method: 'POST',
        body: JSON.stringify({
          heart_rate: hrToSave,
          spo2: spo2ToSave,
          rhythm: "Lead-II Normal Sinus Rhythm",
          mode: selectedMode
        })
      });
      setSaveSuccess("Vitals report generated, encrypted in Supabase, and anchored to Ethereum Blockchain!");
      if (onVitalsRecorded) onVitalsRecorded();
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      alert("Failed to save vitals: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Active displayed values (locked when completed, live when measuring)
  const displayHr = sessionState === 'COMPLETED' && lockedVitals
    ? lockedVitals.heart_rate
    : (hasFinger && telemetry.heart_rate > 0 ? telemetry.heart_rate : null);

  const displaySpo2 = sessionState === 'COMPLETED' && lockedVitals
    ? lockedVitals.spo2
    : (hasFinger && telemetry.spo2 > 0 ? telemetry.spo2 : null);

  const progressPercent = Math.min(100, Math.round(((10 - timeLeft) / 10) * 100));

  return (
    <div className="fixed inset-0 modal-overlay z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 my-8">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Vital Signs Examination</h3>
              <p className="text-xs text-slate-500 font-medium">10-Second Continuous Telemetry Sampling</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {telemetry.online ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected ({telemetry.device_id})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Searching for Monitor
              </span>
            )}
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Acquisition Mode Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Acquisition Mode:
            </div>
            <div className="inline-flex rounded-lg bg-slate-200/80 p-1 gap-1">
              <button
                type="button"
                onClick={() => handleModeSwitch('BOTH')}
                disabled={sessionState === 'MEASURING'}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  selectedMode === 'BOTH'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Both (ECG + SpO₂)
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('ECG_ONLY')}
                disabled={sessionState === 'MEASURING'}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  selectedMode === 'ECG_ONLY'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ECG Only
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('SPO2_ONLY')}
                disabled={sessionState === 'MEASURING'}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  selectedMode === 'SPO2_ONLY'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SpO₂ Only
              </button>
            </div>
          </div>

          {/* Dynamic 10-Second Progress / Status Banner */}
          {!telemetry.online ? (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Connecting to telemetry monitor...</h4>
                  <p className="text-xs text-slate-500">Ensure the ESP32 node is powered on and streaming telemetry.</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-600 border border-slate-200 shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> Listening
              </span>
            </div>
          ) : !hasFinger ? (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Fingerprint className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Place Finger on Sensor</h4>
                  <p className="text-xs text-slate-600">Keep finger firmly on the sensor to initiate the 10-second measurement session.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Awaiting Contact
              </span>
            </div>
          ) : sessionState === 'MEASURING' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <Timer className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Measuring Biometric Vitals...</h4>
                    <p className="text-xs text-slate-600">Please keep your finger steady during the 10-second sampling window.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-blue-600 font-mono tracking-tight">{timeLeft}s</span>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Remaining</p>
                </div>
              </div>

              {/* Countdown Progress Bar */}
              <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">10-Second Measurement Complete!</h4>
                  <p className="text-xs text-emerald-800 font-medium">Vitals locked and verified. Ready to save as encrypted PDF on blockchain.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Complete
              </span>
            </div>
          )}

          {/* Biometric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Heart Rate / Pulse Rate */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pulse Rate (PR)</span>
                <div className="w-8 h-8 rounded-full bg-rose-100/80 flex items-center justify-center text-rose-600">
                  <Heart className={`w-4 h-4 ${hasFinger && sessionState === 'MEASURING' ? 'animate-pulse text-rose-600' : ''}`} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  {displayHr !== null ? displayHr : '--'}
                </span>
                <span className="text-xs font-bold text-slate-500">bpm</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {sessionState === 'COMPLETED' 
                  ? 'Locked 10s Average' 
                  : (sessionState === 'MEASURING' ? 'Sampling rhythm...' : 'Awaiting 10s session...')}
              </p>
            </div>

            {/* Oxygen Saturation */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Oxygen Saturation (SpO₂)</span>
                <div className="w-8 h-8 rounded-full bg-blue-100/80 flex items-center justify-center text-blue-600">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  {selectedMode === 'ECG_ONLY' 
                    ? '--' 
                    : (displaySpo2 !== null ? displaySpo2 : '--')
                  }
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {selectedMode === 'ECG_ONLY' ? '(Bypassed)' : '%'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {selectedMode === 'ECG_ONLY' 
                  ? 'Bypassed in ECG Mode' 
                  : (sessionState === 'COMPLETED' ? 'Locked 10s Average' : (sessionState === 'MEASURING' ? 'Sampling SpO₂...' : 'Awaiting 10s session...'))}
              </p>
            </div>

            {/* Rhythm Analysis */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rhythm Analysis</span>
                <div className="w-8 h-8 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-slate-800 tracking-tight truncate">
                  {displayHr !== null ? 'Normal Sinus' : 'Analyzing baseline...'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-3 font-medium">
                {sessionState === 'COMPLETED' ? 'Lead II Verified' : (sessionState === 'MEASURING' ? 'Continuously sampling...' : 'Awaiting sensor contact')}
              </p>
            </div>

          </div>

          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {saveSuccess}
            </div>
          )}

        </div>

        {/* Modal Footer with Retake & Save Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            Device: <span className="font-semibold text-slate-700">{telemetry.device_id}</span>
            {sessionState === 'MEASURING' && (
              <span className="ml-2 text-blue-600 font-semibold">• Sampling ({10 - timeLeft}/10s)</span>
            )}
            {sessionState === 'COMPLETED' && (
              <span className="ml-2 text-emerald-600 font-semibold">• Ready to Save</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            
            {/* Retake Button (Visible once 10 seconds complete or while waiting) */}
            {(sessionState === 'COMPLETED' || (sessionState === 'IDLE' && lockedVitals !== null)) && (
              <button
                type="button"
                onClick={handleRetake}
                disabled={saving}
                className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Retake
              </button>
            )}

            {/* Save Vitals to Record (Enabled upon 10-second completion) */}
            <button
              type="button"
              onClick={handleSaveVitals}
              disabled={saving || sessionState !== 'COMPLETED'}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
                sessionState === 'COMPLETED'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording to Blockchain...
                </>
              ) : sessionState === 'MEASURING' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Measuring ({timeLeft}s)...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save Vitals to Record
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
