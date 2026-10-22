from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import hashlib
import uuid

from ..database import get_db
from ..models import User, RoleEnum, AuditLog, Consent, Prescription, Diagnosis, Observation, MedicalRecord
from ..services.auth import get_current_user
from ..services.crypto import crypto_service
from ..services.storage import storage_service
from ..services.blockchain import blockchain_service
from ..services.pdf_generator import generate_vitals_pdf

router = APIRouter(prefix="/clinical", tags=["clinical"])

# --- Pydantic Models ---
class PrescriptionCreate(BaseModel):
    patient_id: int
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    notes: Optional[str] = None

class DiagnosisCreate(BaseModel):
    patient_id: int
    condition_name: str
    severity: Optional[str] = None
    notes: Optional[str] = None

class ObservationCreate(BaseModel):
    patient_id: int
    observation_type: str
    value: str
    unit: Optional[str] = None

# --- Helper function for authorization ---
def verify_doctor_access(patient_id: int, db: Session, current_user: User):
    if current_user.role != RoleEnum.doctor:
        raise HTTPException(status_code=403, detail="Only doctors can add clinical data")
    if current_user.verification_status != "verified":
        raise HTTPException(status_code=403, detail="Doctor account must be verified")
    
    consent = db.query(Consent).filter(
        Consent.patient_id == patient_id,
        Consent.doctor_id == current_user.id,
        Consent.status == "active"
    ).first()
    if not consent:
        raise HTTPException(status_code=403, detail="No active consent from this patient")

# --- Prescriptions ---
@router.post("/prescriptions", status_code=status.HTTP_201_CREATED)
def create_prescription(data: PrescriptionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_doctor_access(data.patient_id, db, current_user)
    
    record = Prescription(
        patient_id=data.patient_id,
        doctor_id=current_user.id,
        medication_name=data.medication_name,
        dosage=data.dosage,
        frequency=data.frequency,
        duration=data.duration,
        notes=data.notes
    )
    db.add(record)
    db.add(AuditLog(user_id=current_user.id, action="CREATE_PRESCRIPTION", resource_id=str(data.patient_id)))
    db.commit()
    return {"message": "Prescription created"}

# --- Diagnoses ---
@router.post("/diagnoses", status_code=status.HTTP_201_CREATED)
def create_diagnosis(data: DiagnosisCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_doctor_access(data.patient_id, db, current_user)
    
    record = Diagnosis(
        patient_id=data.patient_id,
        doctor_id=current_user.id,
        condition_name=data.condition_name,
        severity=data.severity,
        notes=data.notes
    )
    db.add(record)
    db.add(AuditLog(user_id=current_user.id, action="CREATE_DIAGNOSIS", resource_id=str(data.patient_id)))
    db.commit()
    return {"message": "Diagnosis created"}

# --- Observations ---
@router.post("/observations", status_code=status.HTTP_201_CREATED)
def create_observation(data: ObservationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_doctor_access(data.patient_id, db, current_user)
    
    record = Observation(
        patient_id=data.patient_id,
        doctor_id=current_user.id,
        observation_type=data.observation_type,
        value=data.value,
        unit=data.unit
    )
    db.add(record)
    db.add(AuditLog(user_id=current_user.id, action="CREATE_OBSERVATION", resource_id=str(data.patient_id)))
    db.commit()
    return {"message": "Observation created"}

# --- Retrieve for Patient ---
@router.get("/patient-data")
def get_patient_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.patient:
        raise HTTPException(status_code=403, detail="Only patients can view this data")
        
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == current_user.id).all()
    diagnoses = db.query(Diagnosis).filter(Diagnosis.patient_id == current_user.id).all()
    observations = db.query(Observation).filter(Observation.patient_id == current_user.id).all()
    
    db.add(AuditLog(user_id=current_user.id, action="VIEW_CLINICAL_DATA"))
    db.commit()
    
    return {
        "prescriptions": prescriptions,
        "diagnoses": diagnoses,
        "observations": observations
    }

# --- Telemetry Ingestion & Real-Time Monitoring ---
class TelemetryIngest(BaseModel):
    device_id: Optional[str] = "ESP32-VITALS-01"
    finger_detected: bool = False
    ir_value: Optional[int] = 0
    leads_off: Optional[bool] = False
    heart_rate: Optional[int] = 0
    spo2: Optional[int] = 0
    ecg_samples: Optional[List[int]] = []

class ModeChange(BaseModel):
    mode: str

class SaveVitalsRequest(BaseModel):
    heart_rate: int
    spo2: int
    rhythm: Optional[str] = "Normal Sinus Rhythm"
    mode: Optional[str] = "BOTH"
    notes: Optional[str] = None

# In-memory telemetry cache
telemetry_state = {
    "device_id": "ESP32-VITALS-01",
    "finger_detected": False,
    "ir_value": 0,
    "leads_off": True,
    "heart_rate": 0,
    "spo2": 0,
    "ecg_samples": [],
    "mode": "BOTH",
    "target_mode": "BOTH",
    "last_seen": None
}

@router.post("/telemetry/ingest")
def ingest_telemetry(data: TelemetryIngest):
    """
    Called by ESP32 to upload biometric telemetry.
    Returns the target mode to dynamically sync the hardware node.
    """
    telemetry_state["device_id"] = data.device_id or "ESP32-VITALS-01"
    telemetry_state["finger_detected"] = bool(data.finger_detected)
    telemetry_state["ir_value"] = data.ir_value or 0
    telemetry_state["leads_off"] = bool(data.leads_off) if data.leads_off is not None else False
    telemetry_state["heart_rate"] = data.heart_rate or 0
    telemetry_state["spo2"] = data.spo2 or 0
    telemetry_state["ecg_samples"] = data.ecg_samples or []
    telemetry_state["last_seen"] = datetime.utcnow()
    
    return {
        "status": "ok",
        "mode": telemetry_state["target_mode"]
    }

@router.get("/telemetry/latest")
def get_latest_telemetry():
    """
    Frontend polls this to receive live telemetry and connection status.
    """
    is_online = False
    if telemetry_state["last_seen"]:
        # ESP32 sends every 1.0s, allow up to 4.0s before marking offline
        time_diff = (datetime.utcnow() - telemetry_state["last_seen"]).total_seconds()
        is_online = time_diff < 4.0

    return {
        "online": is_online,
        "device_id": telemetry_state["device_id"],
        "finger_detected": telemetry_state["finger_detected"],
        "ir_value": telemetry_state["ir_value"],
        "leads_off": telemetry_state["leads_off"],
        "heart_rate": telemetry_state["heart_rate"],
        "spo2": telemetry_state["spo2"],
        "ecg_samples": telemetry_state["ecg_samples"],
        "mode": telemetry_state["target_mode"],
        "last_seen": telemetry_state["last_seen"].isoformat() if telemetry_state["last_seen"] else None
    }

@router.post("/telemetry/mode")
def set_telemetry_mode(data: ModeChange):
    """
    Sets the acquisition mode ('BOTH', 'ECG_ONLY', or 'SPO2_ONLY').
    """
    mode = data.mode.upper().strip()
    if mode not in ["BOTH", "ECG_ONLY", "SPO2_ONLY"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Supported: BOTH, ECG_ONLY, SPO2_ONLY")
    telemetry_state["target_mode"] = mode
    return {"status": "ok", "mode": mode}

@router.post("/telemetry/save-vitals")
def save_vitals(
    data: SaveVitalsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Saves a captured vitals session as an encrypted PDF report in Supabase,
    anchors its cryptographic hash onto the Ethereum blockchain, and records
    structured clinical observations.
    """
    # 1. Generate Hospital-Grade Vitals Examination PDF
    patient_display_name = getattr(current_user, "full_name", None) or current_user.email
    pdf_bytes = generate_vitals_pdf(
        patient_name=patient_display_name,
        patient_email=current_user.email,
        patient_id=current_user.id,
        heart_rate=data.heart_rate,
        spo2=data.spo2,
        rhythm=data.rhythm or "Lead-II Normal Sinus Rhythm",
        mode=data.mode or telemetry_state.get("target_mode", "BOTH"),
        device_id=telemetry_state.get("device_id", "ESP32-VITALS-01")
    )

    # 2. Compute Original File SHA-256 Hash
    original_hash = hashlib.sha256(pdf_bytes).hexdigest()

    # 3. Encrypt PDF using AES-256-GCM
    encrypted_bytes = crypto_service.encrypt(pdf_bytes)

    # 4. Upload Encrypted PDF to Supabase Storage
    unique_record_id = str(uuid.uuid4())
    file_name = f"{current_user.id}/{unique_record_id}_vitals_report.pdf.enc"
    storage_path = storage_service.upload_file(file_name, encrypted_bytes, "application/pdf")

    # 5. Anchor SHA-256 Hash onto the Sepolia Blockchain
    tx_hash = None
    try:
        tx_hash = blockchain_service.store_record_hash(unique_record_id, original_hash)
    except Exception as e:
        # If blockchain fails, clean up Supabase storage to avoid orphaned files
        try:
            storage_service.client.storage.from_(storage_service.bucket_name).remove([file_name])
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Blockchain verification failed: {str(e)}")

    # 6. Save as Official Medical Record in Database
    desc = f"Biometric Telemetry Report ({data.mode or 'BOTH'}) - Heart Rate: {data.heart_rate} bpm, SpO2: {data.spo2}%"
    record = MedicalRecord(
        patient_id=current_user.id,
        doctor_id=None,
        file_type="Biometric Vitals Report",
        supabase_file_path=storage_path,
        record_hash=original_hash,
        blockchain_tx_hash=tx_hash,
        description=desc
    )
    db.add(record)

    # 7. Also record structured Observations
    try:
        obs_hr = Observation(
            patient_id=current_user.id,
            doctor_id=None,
            observation_type="Heart Rate",
            value=str(data.heart_rate),
            unit="bpm"
        )
        obs_spo2 = Observation(
            patient_id=current_user.id,
            doctor_id=None,
            observation_type="Oxygen Saturation",
            value=str(data.spo2),
            unit="%"
        )
        db.add(obs_hr)
        db.add(obs_spo2)
    except Exception:
        pass

    # 8. Audit Log
    db.add(AuditLog(user_id=current_user.id, action="RECORD_VITALS_PDF", resource_id=str(current_user.id)))
    db.commit()
    db.refresh(record)

    return {
        "message": "Vitals successfully encrypted, stored in Supabase, and anchored to Ethereum blockchain",
        "record_id": record.id,
        "tx_hash": tx_hash
    }
