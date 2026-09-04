from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..database import get_db
from ..models import User, RoleEnum
from ..services.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/users", tags=["users"])

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: RoleEnum
    license_number: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user.role == RoleEnum.doctor and not user.license_number:
        raise HTTPException(status_code=400, detail="License number is required for doctors")

    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role=user.role,
        license_number=user.license_number
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "user_id": new_user.id}

@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    # The deployed frontend has a bug where it sends url-encoded data but sets Content-Type to application/json
    # We must manually parse the body as a string and extract the fields
    body_bytes = await request.body()
    body_str = body_bytes.decode('utf-8')
    
    import urllib.parse
    parsed_data = urllib.parse.parse_qs(body_str)
    
    username = parsed_data.get('username', [None])[0]
    password = parsed_data.get('password', [None])[0]
    
    # Fallback to json if somehow it actually is json
    if not username and not password:
        try:
            import json
            json_data = json.loads(body_str)
            username = json_data.get('username')
            password = json_data.get('password')
        except:
            pass

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing username or password")

    user = db.query(User).filter(User.email == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}
@router.get("")
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Not authorized. Admins only.")
    
    users = db.query(User).all()
    # Mask passwords before returning
    for u in users:
        u.hashed_password = "*****"
    return users

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Not authorized. Admins only.")
    
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_to_delete.role == RoleEnum.admin:
        raise HTTPException(status_code=400, detail="Cannot delete an admin user")

    from ..models import MedicalRecord, Consent, AuditLog
    
    # Manually delete dependent records to avoid Foreign Key violations
    db.query(AuditLog).filter(AuditLog.user_id == user_id).delete()
    db.query(Consent).filter((Consent.patient_id == user_id) | (Consent.doctor_id == user_id)).delete()
    db.query(MedicalRecord).filter((MedicalRecord.patient_id == user_id) | (MedicalRecord.doctor_id == user_id)).delete()
    db.delete(user_to_delete)
    
    db.commit()
    return {"message": "User and all associated data successfully deleted"}
