from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import User, Consent, RoleEnum, AuditLog
from ..services.auth import get_current_user

router = APIRouter(prefix="/consent", tags=["consent"])

@router.post("/grant/{doctor_id}")
def grant_consent(doctor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.patient:
        raise HTTPException(status_code=403, detail="Only patients can grant consent")

    doctor = db.query(User).filter(User.id == doctor_id, User.role == RoleEnum.doctor).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    existing_consent = db.query(Consent).filter(
        Consent.patient_id == current_user.id,
        Consent.doctor_id == doctor_id,
        Consent.status == "active"
    ).first()

    if existing_consent:
        return {"message": "Consent already active"}

    consent = Consent(patient_id=current_user.id, doctor_id=doctor_id)
    db.add(consent)

    audit = AuditLog(user_id=current_user.id, action="GRANT_CONSENT", resource_id=str(doctor_id))
    db.add(audit)

    db.commit()
    return {"message": "Consent granted successfully"}

@router.post("/revoke/{doctor_id}")
def revoke_consent(doctor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.patient:
        raise HTTPException(status_code=403, detail="Only patients can revoke consent")

    consent = db.query(Consent).filter(
        Consent.patient_id == current_user.id,
        Consent.doctor_id == doctor_id,
        Consent.status == "active"
    ).first()

    if not consent:
        raise HTTPException(status_code=404, detail="No active consent found for this doctor")

    consent.status = "revoked"
    consent.revoked_at = datetime.utcnow()

    audit = AuditLog(user_id=current_user.id, action="REVOKE_CONSENT", resource_id=str(doctor_id))
    db.add(audit)

    db.commit()
    return {"message": "Consent revoked successfully"}

@router.get("/active")
def get_active_consents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.patient:
        raise HTTPException(status_code=403, detail="Only patients can view their active consents")
    
    consents = db.query(Consent).filter(
        Consent.patient_id == current_user.id,
        Consent.status == "active"
    ).all()
    return consents

@router.get("")
def get_all_consents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Not authorized. Admins only.")
    
    return db.query(Consent).all()
