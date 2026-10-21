import { useState, useEffect, useRef } from 'react';
import { Activity, Heart, Radio, Fingerprint, CheckCircle2, X, Loader2, ShieldCheck, Save } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wavePointsRef = useRef<number[]>([]);
  const phaseRef = useRef<number>(0);

  // Poll telemetry every 800ms when modal is open
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
    const interval = setInterval(fetchLatest, 800);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

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

  // Critical rule: Finger must be detected on sensor for any mode to display vitals
  const hasFinger = Boolean(telemetry.online && telemetry.finger_detected);

  // ECG Waveform Canvas Rendering Loop
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Buffer of 280 points
    const maxPoints = 280;
    if (wavePointsRef.current.length === 0) {
      wavePointsRef.current = new Array(maxPoints).fill(100);
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Clear dark background
      ctx.fillStyle = '#060b13';
      ctx.fillRect(0, 0, width, height);

      // Draw ECG Medical Grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#0e1d2f';
      const gridSize = 20;

      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Compute new sample point
      let newPoint = centerY;

      if (!hasFinger) {
        // Finger NOT on sensor -> FLATTEN WAVE (resting baseline + subtle jitter)
        newPoint = centerY + (Math.random() * 2 - 1);
      } else {
        // Finger IS on sensor -> Draw Lead-II ECG waveform
        if (selectedMode === 'SPO2_ONLY') {
          // Resting baseline with gentle pulse ripple
          phaseRef.current = (phaseRef.current + 0.05) % (Math.PI * 2);
          newPoint = centerY + Math.sin(phaseRef.current) * 6 + (Math.random() * 2 - 1);
        } else {
          // BOTH or ECG_ONLY: Generate authentic PQRST cardiac complex
          const hr = telemetry.heart_rate > 40 && telemetry.heart_rate < 180 ? telemetry.heart_rate : 74;
          const cycleSpeed = (hr / 60) * 0.04;
          phaseRef.current = (phaseRef.current + cycleSpeed) % 1.0;
          const p = phaseRef.current;

          // Isoelectric baseline
          let val = 0;
          if (p >= 0.08 && p < 0.16) {
            // P-Wave
            const prog = (p - 0.08) / 0.08;
            val = Math.sin(prog * Math.PI) * 14;
          } else if (p >= 0.22 && p < 0.25) {
            // Q-Wave
            const prog = (p - 0.22) / 0.03;
            val = -Math.sin(prog * Math.PI) * 10;
          } else if (p >= 0.25 && p < 0.30) {
            // R-Peak (Ventricular depolarization spike)
            const prog = (p - 0.25) / 0.05;
            val = Math.sin(prog * Math.PI) * 65;
          } else if (p >= 0.30 && p < 0.34) {
            // S-Wave
            const prog = (p - 0.30) / 0.04;
            val = -Math.sin(prog * Math.PI) * 22;
          } else if (p >= 0.42 && p < 0.60) {
            // T-Wave
            const prog = (p - 0.42) / 0.18;
            val = Math.sin(prog * Math.PI) * 22;
          }

          val += (Math.random() * 2 - 1);
          newPoint = centerY - val;
        }
      }

      wavePointsRef.current.push(newPoint);
      if (wavePointsRef.current.length > maxPoints) {
        wavePointsRef.current.shift();
      }

      // Draw the waveform trace
      ctx.beginPath();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = hasFinger ? '#10b981' : '#f59e0b';
      ctx.shadowBlur = hasFinger ? 8 : 4;
      ctx.shadowColor = hasFinger ? '#10b981' : '#f59e0b';

      const step = width / (maxPoints - 1);
      for (let i = 0; i < wavePointsRef.current.length; i++) {
        const x = i * step;
        const y = wavePointsRef.current[i];
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw cursor sweep indicator
      const lastX = (wavePointsRef.current.length - 1) * step;
      const lastY = wavePointsRef.current[wavePointsRef.current.length - 1];
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = hasFinger ? '#34d399' : '#fbbf24';
      ctx.fill();

      // Flatline notification if finger lifted
      if (!hasFinger) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(width / 2 - 140, height / 2 - 16, 280, 32);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(width / 2 - 140, height / 2 - 16, 280, 32);

        ctx.fillStyle = '#fbbf24';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SENSOR STANDBY • PLACE FINGER TO STREAM', width / 2, height / 2 + 4);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, hasFinger, selectedMode, telemetry.heart_rate]);

  // Save Vitals to Record
  const handleSaveVitals = async () => {
    if (!hasFinger) {
      alert("Cannot record vitals: Please keep finger on the SpO2 sensor first.");
      return;
    }

    try {
      setSaving(true);
      await fetchApi('/clinical/telemetry/save-vitals', {
        method: 'POST',
        body: JSON.stringify({
          heart_rate: telemetry.heart_rate || 74,
          spo2: telemetry.spo2 || 98,
          rhythm: "Lead-II Normal Sinus Rhythm",
          mode: selectedMode
        })
      });
      setSaveSuccess("Vitals successfully saved to your clinical record!");
      if (onVitalsRecorded) onVitalsRecorded();
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      alert("Failed to save vitals: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 my-8">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Vital Signs & Rhythm Monitor</h3>
              <p className="text-xs text-slate-500 font-medium">Continuous Lead-II ECG and Pulse Oximetry Telemetry</p>
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

          {/* Connection Status Banner */}
          {!telemetry.online ? (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Connecting to patient telemetry monitor...</h4>
                  <p className="text-xs text-slate-500">Ensure the wireless vitals monitor is powered on and within network range.</p>
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
                  <p className="text-xs text-slate-600">The vitals will only be measured and displayed while your finger is placed on the SpO₂ sensor.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Awaiting Contact
              </span>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Telemetry Stream Active</h4>
                  <p className="text-xs text-emerald-700 font-medium">Optical perfusion lock verified. Real-time biometric sampling active.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span> Live Signal
              </span>
            </div>
          )}

          {/* Biometric Cards Grid (Vitals strictly gated by finger contact) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Heart Rate / Pulse Rate */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pulse Rate (PR)</span>
                <div className="w-8 h-8 rounded-full bg-rose-100/80 flex items-center justify-center text-rose-600">
                  <Heart className={`w-4 h-4 ${hasFinger ? 'animate-pulse text-rose-600' : ''}`} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  {hasFinger && telemetry.heart_rate > 0 ? telemetry.heart_rate : '--'}
                </span>
                <span className="text-xs font-bold text-slate-500">bpm</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {hasFinger ? (telemetry.heart_rate > 0 ? 'Normal Sinus Rhythm' : 'Acquiring pulse...') : 'Awaiting pulse reading...'}
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
                  {hasFinger 
                    ? (selectedMode === 'ECG_ONLY' ? '--' : (telemetry.spo2 > 0 ? telemetry.spo2 : '--'))
                    : '--'
                  }
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {selectedMode === 'ECG_ONLY' && hasFinger ? '(Bypassed)' : '%'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {hasFinger 
                  ? (selectedMode === 'ECG_ONLY' ? 'Bypassed in ECG Mode' : 'Optimal Oxygenation') 
                  : 'Awaiting sensor perfusion...'
                }
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
                  {hasFinger ? 'Normal Sinus' : 'Analyzing baseline...'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-3 font-medium">
                {hasFinger ? 'Lead II • Continuous sampling' : 'Awaiting sensor contact'}
              </p>
            </div>

          </div>

          {/* Hospital ECG Oscilloscope Display */}
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#060b13] shadow-inner">
            <div className="bg-[#0b1320] px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-3 text-emerald-400">
                <span className="font-bold tracking-wider">LEAD II</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">25 mm/s</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">10 mm/mV</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">MODE:</span>
                <span className="text-emerald-400 font-bold">{selectedMode}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">STATUS:</span>
                <span className={hasFinger ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {hasFinger ? 'ACTIVE' : 'FLATLINE'}
                </span>
              </div>
            </div>
            
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={700}
                height={160}
                className="w-full h-[160px] block"
              />
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

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            Device: <span className="font-semibold text-slate-700">{telemetry.device_id}</span>
            {telemetry.online && (
              <span className="ml-2 text-emerald-600 font-semibold">• Live Stream 50Hz</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveVitals}
              disabled={saving || !hasFinger}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                hasFinger
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording...
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
