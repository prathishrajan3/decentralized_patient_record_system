from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import hashlib
import uuid
import time

from ..database import get_db
from ..models import User, MedicalRecord, Consent, RoleEnum, AuditLog
from ..services.auth import get_current_user
from ..services.crypto import crypto_service
from ..services.storage import storage_service
from ..services.blockchain import blockchain_service

router = APIRouter(prefix="/records", tags=["records"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_record(
    patient_id: int = Form(...),
    file_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == RoleEnum.patient:
        if patient_id != current_user.id:
            raise HTTPException(status_code=403, detail="Patients can only upload their own records")
        assigned_doctor_id = None
    elif current_user.role == RoleEnum.doctor:
        # Check if doctor has consent
        consent = db.query(Consent).filter(
            Consent.patient_id == patient_id,
            Consent.doctor_id == current_user.id,
            Consent.status == "active"
        ).first()

        if not consent:
            raise HTTPException(status_code=403, detail="No active consent from this patient")
        assigned_doctor_id = current_user.id
    else:
        raise HTTPException(status_code=403, detail="Admins cannot upload records")

    # Read and hash original file
    file_bytes = await file.read()
    original_hash = hashlib.sha256(file_bytes).hexdigest()

    # Encrypt file
    encrypted_bytes = crypto_service.encrypt(file_bytes)
    
    # Upload to Supabase
    file_name = f"{patient_id}/{uuid.uuid4()}_{file.filename}.enc"
    storage_path = storage_service.upload_file(file_name, encrypted_bytes)

    # Store hash on Blockchain
    record_uuid = str(uuid.uuid4())
    tx_hash = None
    try:
        # In MVP, if blockchain isn't fully configured, this might fail or be bypassed
        tx_hash = blockchain_service.store_record_hash(record_uuid, original_hash)
    except Exception as e:
        print(f"Blockchain submission failed (expected in dev without full setup): {e}")

    # Save to Database
    record = MedicalRecord(
        patient_id=patient_id,
        doctor_id=assigned_doctor_id,
        file_type=file_type,
        supabase_file_path=storage_path,
        record_hash=original_hash,
        blockchain_tx_hash=tx_hash
    )
    db.add(record)
    
    # Audit log
    audit = AuditLog(user_id=current_user.id, action="UPLOAD_RECORD", resource_id=str(patient_id))
    db.add(audit)
    
    db.commit()
    db.refresh(record)

    return {"message": "Record uploaded and encrypted successfully", "record_id": record.id, "tx_hash": tx_hash}

@router.get("")
def get_records(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == RoleEnum.admin:
        records = db.query(MedicalRecord).all()
        return records
        
    elif current_user.role == RoleEnum.patient:
        records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == current_user.id).all()
        # Audit log
        audit = AuditLog(user_id=current_user.id, action="VIEW_OWN_RECORDS")
        db.add(audit)
        db.commit()
        return records
    
    elif current_user.role == RoleEnum.doctor:
        # Doctor can see records of patients they have active consent for
        consents = db.query(Consent).filter(Consent.doctor_id == current_user.id, Consent.status == "active").all()
        patient_ids = [c.patient_id for c in consents]
        records = db.query(MedicalRecord).filter(MedicalRecord.patient_id.in_(patient_ids)).all()
        return records
