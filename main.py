from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Index, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import httpx
import os
import logging
import time
import json

# Import configuration and security middleware
from config import get_settings, SecurityConfig, validate_production_config
from security_middleware import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware, 
    AuthenticationMiddleware,
    create_jwt_token
)

# Initialize configuration
settings = get_settings()

# Validate production configuration
if settings.environment == "production":
    validate_production_config()

DATABASE_URL = settings.database_url
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Configure simple structured logging
logger = logging.getLogger("medical_imports")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# SQLAlchemy models
class DrugModel(Base):
    __tablename__ = "drugs"
    id = Column(Integer, primary_key=True, index=True)
    ndc = Column(String, unique=True, index=True, nullable=False)
    product_name = Column(String, nullable=False, index=True)
    generic_name = Column(String, nullable=True, index=True)
    manufacturer = Column(String, nullable=False)
    dosage_form = Column(String, nullable=True)
    route_of_administration = Column(String, nullable=True)
    indications_and_usage = Column(Text, nullable=True)
    adverse_reactions = Column(Text, nullable=True)
    warnings = Column(Text, nullable=True)

class DiagnosisModel(Base):
    __tablename__ = "diagnoses"
    id = Column(Integer, primary_key=True, index=True)
    condition_name = Column(String, nullable=False, index=True)
    icd10_code = Column(String, index=True, nullable=False)
    icd9_code = Column(String, nullable=True)
    synonyms = Column(String, nullable=True)  # comma separated (kept for backward compatibility)
    description = Column(Text, nullable=True)

class MedicalCodeModel(Base):
    __tablename__ = "medical_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, index=True, nullable=False)
    code_system = Column(String, nullable=False)
    description = Column(String, nullable=False)

class SpecialtyModel(Base):
    __tablename__ = "specialties"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    related_diagnoses = Column(String, nullable=True)  # comma separated
    related_procedures = Column(String, nullable=True)  # comma separated

# New: normalized child tables
class DrugIngredientModel(Base):
    __tablename__ = "drug_ingredients"
    id = Column(Integer, primary_key=True)
    ndc = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    strength = Column(String, nullable=True)
    __table_args__ = (
        Index("ix_drug_ingr_ndc_name_strength", "ndc", "name", "strength", unique=True),
    )

class DiagnosisSynonymModel(Base):
    __tablename__ = "diagnosis_synonyms"
    id = Column(Integer, primary_key=True)
    diagnosis_id = Column(Integer, ForeignKey("diagnoses.id"), nullable=False, index=True)
    synonym = Column(String, nullable=False, index=True)
    __table_args__ = (
        Index("ix_diag_syn_unique", "diagnosis_id", "synonym", unique=True),
    )

# Import state KV table for scheduled jobs
class ImportStateModel(Base):
    __tablename__ = "import_state"
    key = Column(String, primary_key=True)
    value = Column(String, nullable=True)

# ensure newly added tables are created
Base.metadata.create_all(bind=engine)

# Pydantic schemas
class ActiveIngredient(BaseModel):
    name: str
    strength: str

class Drug(BaseModel):
    ndc: str
    product_name: str
    generic_name: Optional[str] = None
    manufacturer: str
    dosage_form: Optional[str] = None
    route_of_administration: Optional[str] = None
    indications_and_usage: Optional[str] = None
    adverse_reactions: Optional[str] = None
    warnings: Optional[str] = None
    active_ingredients: Optional[List[ActiveIngredient]] = None

class Diagnosis(BaseModel):
    condition_name: str
    icd10_code: str
    icd9_code: Optional[str] = None
    synonyms: Optional[List[str]] = None
    description: Optional[str] = None

class MedicalCode(BaseModel):
    code: str
    code_system: str
    description: str

class Specialty(BaseModel):
    name: str
    description: Optional[str] = None
    related_diagnoses: Optional[List[str]] = None
    related_procedures: Optional[List[str]] = None

# FastAPI app with production settings
app = FastAPI(
    title="Medical Information API",
    version="1.0.0",
    description="Production API for comprehensive medical information and drug database",
    docs_url="/api/docs" if settings.environment != "production" else None,
    redoc_url="/api/redoc" if settings.environment != "production" else None,
    openapi_url="/api/openapi.json" if settings.environment != "production" else None
)

# Security middleware (order matters - add from innermost to outermost)
if settings.enable_security_headers:
    app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
if settings.allowed_api_keys_list:
    app.add_middleware(AuthenticationMiddleware)

# Trusted host middleware for production
if settings.environment == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

# Configure CORS for production
cors_config = SecurityConfig.get_cors_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_config["allow_origins"],
    allow_credentials=cors_config["allow_credentials"],
    allow_methods=cors_config["allow_methods"],
    allow_headers=cors_config["allow_headers"],
    expose_headers=cors_config["expose_headers"]
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Health check and monitoring endpoints
@app.get("/health", tags=["Monitoring"])
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint for production monitoring"""
    try:
        # Check database connection
        db.execute(text("SELECT 1"))
        
        # Check external dependencies
        http_client = get_http_client()
        
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "database": "connected",
            "version": "1.0.0",
            "environment": settings.environment
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.get("/metrics", tags=["Monitoring"])
async def metrics():
    """Basic application metrics for monitoring"""
    return {
        "uptime": time.time() - app_start_time,
        "memory_usage": os.getpid(),
        "active_connections": _http_client is not None,
        "rate_limit": {
                "qps": settings.rate_limit_qps,
                "burst": settings.rate_limit_burst
            }
    }

@app.get("/api/status", tags=["Monitoring"])
async def api_status(db: Session = Depends(get_db)):
    """Comprehensive API status with database statistics"""
    try:
        # Get database statistics
        drug_count = db.query(DrugModel).count()
        diagnosis_count = db.query(DiagnosisModel).count()
        
        return {
            "status": "operational",
            "database": {
                "drugs": drug_count,
                "diagnoses": diagnosis_count,
                "medical_codes": db.query(MedicalCodeModel).count(),
                "specialties": db.query(SpecialtyModel).count()
            },
            "rate_limiting": {
                "qps": settings.rate_limit_qps,
                "burst": settings.rate_limit_burst
            },
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Track application start time for uptime calculation
app_start_time = time.time()

# Utility converters

def list_to_csv(items: Optional[List[str]]) -> Optional[str]:
    if items is None:
        return None
    return ",".join(items)


def csv_to_list(value: Optional[str]) -> Optional[List[str]]:
    if value is None or value == "":
        return None
    return [s for s in value.split(",") if s]

# HTTP client with retries/backoff and simple rate limiting
_http_client: Optional[httpx.Client] = None

class RateLimiter:
    def __init__(self, qps: float, burst: int):
        self.qps = max(qps, 0.1)
        self.capacity = max(burst, 1)
        self.tokens = self.capacity
        self.last = time.monotonic()

    def acquire(self):
        while True:
            now = time.monotonic()
            elapsed = now - self.last
            self.last = now
            self.tokens = min(self.capacity, self.tokens + elapsed * self.qps)
            if self.tokens >= 1:
                self.tokens -= 1
                return
            # need to wait for more tokens
            needed = 1 - self.tokens
            time.sleep(needed / self.qps)

_limiter = RateLimiter(settings.rate_limit_qps, settings.rate_limit_burst)

def get_http_client() -> httpx.Client:
    global _http_client
    if _http_client is None:
        _http_client = httpx.Client(timeout=settings.http_timeout)
    return _http_client


def fetch_json(url: str, params: dict) -> dict:
    client = get_http_client()
    backoff = settings.http_retry_base_seconds
    for attempt in range(1, settings.http_retry_max + 1):
        _limiter.acquire()
        try:
            resp = client.get(url, params=params)
            if resp.status_code == 429 or 500 <= resp.status_code < 600:
                # Respect Retry-After if present
                ra = resp.headers.get("Retry-After")
                delay = float(ra) if ra and ra.isdigit() else backoff
                logger.warning(f"upstream_throttle_or_error status={resp.status_code} delay={delay} url={url}")
                time.sleep(delay)
                backoff *= 2
                continue
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            # Only retry on network/server errors
            if attempt < settings.http_retry_max:
                logger.warning(f"http_retry attempt={attempt} error={str(e)} url={url} backoff={backoff}")
                time.sleep(backoff)
                backoff *= 2
                continue
            raise

# Helper upserts for normalized tables

def upsert_drug_ingredients(db: Session, ndc: str, ingredients: Optional[List[dict]]):
    if not ingredients:
        return
    for ing in ingredients:
        try:
            name = (ing or {}).get("name")
            strength = (ing or {}).get("strength")
            if not name:
                continue
            exists = db.query(DrugIngredientModel).filter(
                DrugIngredientModel.ndc == ndc,
                DrugIngredientModel.name == name,
                DrugIngredientModel.strength == strength,
            ).first()
            if not exists:
                db.add(DrugIngredientModel(ndc=ndc, name=name, strength=strength))
        except Exception:
            continue


def upsert_diagnosis_synonyms(db: Session, diagnosis_id: int, synonyms: Optional[List[str]]):
    if not synonyms:
        return
    for s in synonyms:
        if not s:
            continue
        exists = db.query(DiagnosisSynonymModel).filter(
            DiagnosisSynonymModel.diagnosis_id == diagnosis_id,
            DiagnosisSynonymModel.synonym == s,
        ).first()
        if not exists:
            db.add(DiagnosisSynonymModel(diagnosis_id=diagnosis_id, synonym=s))

# Routes
@app.get("/health")
def health():
    return {"status": "ok"}

# Drugs
@app.post("/drugs", response_model=Drug)
def create_drug(payload: Drug, db: Session = Depends(get_db)):
    obj = DrugModel(
        ndc=payload.ndc,
        product_name=payload.product_name,
        generic_name=payload.generic_name,
        manufacturer=payload.manufacturer,
        dosage_form=payload.dosage_form,
        route_of_administration=payload.route_of_administration,
        indications_and_usage=payload.indications_and_usage,
        adverse_reactions=payload.adverse_reactions,
        warnings=payload.warnings,
    )
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Drug with this NDC already exists")
    db.refresh(obj)
    return payload

@app.get("/drugs", response_model=List[Drug])
def list_drugs(q: Optional[str] = Query(None, description="Search in product_name or generic_name"), db: Session = Depends(get_db)):
    query = db.query(DrugModel)
    if q:
        like = f"%{q}%"
        query = query.filter((DrugModel.product_name.ilike(like)) | (DrugModel.generic_name.ilike(like)))
    results = []
    for d in query.all():
        results.append(Drug(
            ndc=d.ndc,
            product_name=d.product_name,
            generic_name=d.generic_name,
            manufacturer=d.manufacturer,
            dosage_form=d.dosage_form,
            route_of_administration=d.route_of_administration,
            indications_and_usage=d.indications_and_usage,
            adverse_reactions=d.adverse_reactions,
            warnings=d.warnings,
        ))
    return results

# Importers: openFDA NDC -> DrugModel
@app.post("/import/openfda/ndc")
def import_openfda_ndc(
    search: Optional[str] = Query("finished:true", description="openFDA search query for NDC endpoint"),
    limit: int = Query(50, ge=1, le=100, description="Number of records to fetch (max 100 per openFDA request)"),
    skip: int = Query(0, ge=0, description="Number of records to skip (pagination)"),
    api_key: Optional[str] = Query(None, description="Optional openFDA API key"),
    db: Session = Depends(get_db),
):
    url = "https://api.fda.gov/drug/ndc.json"
    params = {"search": search, "limit": min(limit, 100), "skip": max(skip, 0)}
    if api_key:
        params["api_key"] = api_key

    try:
        data = fetch_json(url, params)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"openFDA request failed: {str(e)}")

    results = data.get("results", []) or []
    imported = 0
    updated = 0
    skipped = 0
    errors: List[str] = []

    for item in results:
        try:
            ndc = item.get("product_ndc")
            if not ndc:
                skipped += 1
                continue
            product_name = item.get("brand_name") or item.get("brand_name_base") or item.get("generic_name") or "Unknown"
            generic_name = item.get("generic_name")
            manufacturer = item.get("labeler_name") or ", ".join(item.get("openfda", {}).get("manufacturer_name", []) or []) or ""
            dosage_form = item.get("dosage_form")
            route = item.get("route")
            if isinstance(route, list):
                route_of_administration = ",".join(route)
            else:
                route_of_administration = route

            # NDC dataset does not include detailed label sections; leave as None
            indications_and_usage = None
            adverse_reactions = None
            warnings = None

            existing = db.query(DrugModel).filter(DrugModel.ndc == ndc).first()
            if existing:
                existing.product_name = product_name
                existing.generic_name = generic_name
                existing.manufacturer = manufacturer or existing.manufacturer
                existing.dosage_form = dosage_form
                existing.route_of_administration = route_of_administration
                existing.indications_and_usage = indications_and_usage
                existing.adverse_reactions = adverse_reactions
                existing.warnings = warnings
                db.add(existing)
                updated += 1
            else:
                obj = DrugModel(
                    ndc=ndc,
                    product_name=product_name,
                    generic_name=generic_name,
                    manufacturer=manufacturer or "",
                    dosage_form=dosage_form,
                    route_of_administration=route_of_administration,
                    indications_and_usage=indications_and_usage,
                    adverse_reactions=adverse_reactions,
                    warnings=warnings,
                )
                db.add(obj)
                imported += 1

            # Upsert active ingredients if provided
            upsert_drug_ingredients(db, ndc, item.get("active_ingredients"))
        except Exception as ex:
            errors.append(str(ex))
            skipped += 1
    db.commit()

    stats = {
        "source": "openfda_ndc",
        "received": len(results),
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors[:5],
    }
    try:
        _set_state(db, "stats:openfda_ndc", json.dumps(stats))
    except Exception:
        pass
    logger.info(f"import_complete source=openfda_ndc received={len(results)} imported={imported} updated={updated} skipped={skipped} errors={len(errors)}")
    return stats

# Diagnoses
@app.post("/diagnoses", response_model=Diagnosis)
def create_diagnosis(payload: Diagnosis, db: Session = Depends(get_db)):
    obj = DiagnosisModel(
        condition_name=payload.condition_name,
        icd10_code=payload.icd10_code,
        icd9_code=payload.icd9_code,
        synonyms=list_to_csv(payload.synonyms),
        description=payload.description,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    # Also populate normalized synonyms if provided
    if payload.synonyms:
        upsert_diagnosis_synonyms(db, obj.id, payload.synonyms)
        db.commit()
    return payload

@app.get("/diagnoses", response_model=List[Diagnosis])
def list_diagnoses(q: Optional[str] = Query(None, description="Search by name or ICD code"), db: Session = Depends(get_db)):
    query = db.query(DiagnosisModel)
    if q:
        like = f"%{q}%"
        query = query.filter((DiagnosisModel.condition_name.ilike(like)) | (DiagnosisModel.icd10_code.ilike(like)) | (DiagnosisModel.icd9_code.ilike(like)))
    out: List[Diagnosis] = []
    for d in query.all():
        out.append(Diagnosis(
            condition_name=d.condition_name,
            icd10_code=d.icd10_code,
            icd9_code=d.icd9_code,
            synonyms=csv_to_list(d.synonyms),
            description=d.description,
        ))
    return out

# Importer: ClinicalTables Conditions -> DiagnosisModel
@app.post("/import/clinicaltables/conditions")
def import_clinicaltables_conditions(
    terms: str = Query(..., description="Search terms for conditions API (required)"),
    count: int = Query(50, ge=1, le=500, description="Number of results to retrieve (max 500)"),
    offset: int = Query(0, ge=0, description="Starting offset for pagination"),
    db: Session = Depends(get_db),
):
    url = "https://clinicaltables.nlm.nih.gov/api/conditions/v3/search"
    params = {
        "terms": terms,
        "count": count,
        "offset": offset,
        "df": "primary_name",
        "ef": "consumer_name,icd10cm_codes,term_icd9_code,synonyms",
    }
    try:
        data = fetch_json(url, params)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"ClinicalTables request failed: {str(e)}")

    if not isinstance(data, list) or len(data) < 3:
        raise HTTPException(status_code=500, detail="Unexpected response format from ClinicalTables")

    # Expected format: [total, other, items(array of display strings for df), extras(dict of ef arrays)]
    items = data[2] if isinstance(data[2], list) else []
    extras = data[3] if len(data) > 3 and isinstance(data[3], dict) else {}

    icd10_list = extras.get("icd10cm_codes", []) or []
    icd9_list = extras.get("term_icd9_code", []) or []
    syn_list = extras.get("synonyms", []) or []

    imported = 0
    updated = 0
    skipped = 0
    errors: List[str] = []

    def first_code(value) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, list):
            # sometimes code list may already be a list
            if not value:
                return None
            v0 = value[0]
            if isinstance(v0, str):
                return v0.split(",")[0].strip() if v0 else None
            return str(v0)
        if isinstance(value, str):
            return value.split(",")[0].strip() if value else None
        return None

    def normalize_synonyms(value) -> Optional[List[str]]:
        if value is None:
            return None
        if isinstance(value, list):
            return [str(v) for v in value if v]
        if isinstance(value, str):
            # attempt to split on comma
            return [s.strip() for s in value.split(",") if s.strip()]
        return None

    for i, name in enumerate(items):
        try:
            icd10_code = first_code(icd10_list[i]) if i < len(icd10_list) else None
            icd9_code = first_code(icd9_list[i]) if i < len(icd9_list) else None
            synonyms = normalize_synonyms(syn_list[i]) if i < len(syn_list) else None

            if not name or not icd10_code:
                skipped += 1
                continue

            existing = db.query(DiagnosisModel).filter(
                DiagnosisModel.condition_name == name,
                DiagnosisModel.icd10_code == icd10_code,
            ).first()
            if existing:
                existing.icd9_code = icd9_code or existing.icd9_code
                existing.synonyms = list_to_csv(synonyms) or existing.synonyms
                db.add(existing)
                if synonyms:
                    upsert_diagnosis_synonyms(db, existing.id, synonyms)
                updated += 1
            else:
                obj = DiagnosisModel(
                    condition_name=name,
                    icd10_code=icd10_code,
                    icd9_code=icd9_code,
                    synonyms=list_to_csv(synonyms),
                    description=None,
                )
                db.add(obj)
                db.flush()  # get obj.id without committing
                if synonyms:
                    upsert_diagnosis_synonyms(db, obj.id, synonyms)
                imported += 1
        except Exception as ex:
            errors.append(str(ex))
            skipped += 1

    db.commit()

    stats = {
        "source": "clinicaltables_conditions",
        "received": len(items),
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors[:5],
    }
    try:
        _set_state(db, "stats:clinicaltables_conditions", json.dumps(stats))
    except Exception:
        pass
    logger.info(f"import_complete source=clinicaltables_conditions received={len(items)} imported={imported} updated={updated} skipped={skipped} errors={len(errors)} terms=\"{terms}\"")
    return stats

# Medical Codes
@app.post("/codes", response_model=MedicalCode)
def create_code(payload: MedicalCode, db: Session = Depends(get_db)):
    obj = MedicalCodeModel(code=payload.code, code_system=payload.code_system, description=payload.description)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return payload

@app.get("/codes", response_model=List[MedicalCode])
def list_codes(code_system: Optional[str] = None, q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MedicalCodeModel)
    if code_system:
        query = query.filter(MedicalCodeModel.code_system == code_system)
    if q:
        like = f"%{q}%"
        query = query.filter((MedicalCodeModel.code.ilike(like)) | (MedicalCodeModel.description.ilike(like)))
    return [MedicalCode(code=r.code, code_system=r.code_system, description=r.description) for r in query.all()]

# Specialties
@app.post("/specialties", response_model=Specialty)
def create_specialty(payload: Specialty, db: Session = Depends(get_db)):
    obj = SpecialtyModel(
        name=payload.name,
        description=payload.description,
        related_diagnoses=list_to_csv(payload.related_diagnoses),
        related_procedures=list_to_csv(payload.related_procedures),
    )
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Specialty with this name already exists")
    db.refresh(obj)
    return payload

@app.get("/specialties", response_model=List[Specialty])
def list_specialties(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(SpecialtyModel)
    if q:
        like = f"%{q}%"
        query = query.filter(SpecialtyModel.name.ilike(like))
    out: List[Specialty] = []
    for s in query.all():
        out.append(Specialty(
            name=s.name,
            description=s.description,
            related_diagnoses=csv_to_list(s.related_diagnoses),
            related_procedures=csv_to_list(s.related_procedures),
        ))
    return out

# Authentication models
class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "user"

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserModel(BaseModel):
    id: str
    name: str
    email: str
    role: str
    permissions: dict

# Authentication endpoints
@app.post("/api/auth/login", response_model=LoginResponse, tags=["Authentication"])
async def login(login_data: LoginRequest):
    """Authenticate user and return JWT token"""
    # Mock authentication - replace with real authentication logic
    mock_users = {
        "admin@medical.com": {
            "id": "1",
            "name": "Dr. Ahmed Hassan",
            "email": "admin@medical.com",
            "password": "admin123",  # In production, use hashed passwords
            "role": "admin",
            "permissions": {
                "canManageData": True,
                "canAccessAI": True,
                "canExportData": True,
                "canManageUsers": True
            }
        },
        "user@medical.com": {
            "id": "2",
            "name": "Dr. Sarah Johnson",
            "email": "user@medical.com",
            "password": "user123",
            "role": "user",
            "permissions": {
                "canManageData": False,
                "canAccessAI": True,
                "canExportData": False,
                "canManageUsers": False
            }
        }
    }
    
    user = mock_users.get(login_data.email)
    if not user or user["password"] != login_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create JWT token
    token_data = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "permissions": user["permissions"]
    }
    access_token = create_jwt_token(token_data)
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "permissions": user["permissions"]
        }
    )

@app.post("/api/auth/logout", tags=["Authentication"])
async def logout():
    """Logout user (client should remove token)"""
    return {"message": "Successfully logged out"}

@app.get("/api/auth/me", response_model=UserModel, tags=["Authentication"])
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Get current authenticated user information"""
    # This endpoint is protected by AuthenticationMiddleware
    # In a real implementation, decode the JWT token to get user info
    return UserModel(
        id="1",
        name="Dr. Ahmed Hassan",
        email="admin@medical.com",
        role="admin",
        permissions={
            "canManageData": True,
            "canAccessAI": True,
            "canExportData": True,
            "canManageUsers": True
        }
    )

# Root help
@app.get("/")
def root():
    return {
        "message": "Medical API is running",
        "version": "1.0.0",
        "environment": settings.environment,
        "endpoints": [
            "/health",
            "/api/auth/login [POST]",
            "/api/auth/logout [POST]",
            "/api/auth/me [GET]",
            "/drugs [GET, POST]",
            "/import/openfda/ndc [POST]",
            "/import/openfda/label [POST]",
            "/diagnoses [GET, POST]",
            "/import/clinicaltables/conditions [POST]",
            "/codes [GET, POST]",
            "/specialties [GET, POST]",
        ],
        "docs": "/api/docs" if settings.environment != "production" else None,
        "redoc": "/api/redoc" if settings.environment != "production" else None,
    }

# Scheduled automatic imports using APScheduler

def _get_state(db: Session, key: str) -> Optional[str]:
    rec = db.query(ImportStateModel).filter(ImportStateModel.key == key).first()
    return rec.value if rec else None


def _set_state(db: Session, key: str, value: str) -> None:
    rec = db.query(ImportStateModel).filter(ImportStateModel.key == key).first()
    if rec:
        rec.value = value
        db.add(rec)
    else:
        db.add(ImportStateModel(key=key, value=value))
    db.commit()


def run_ndc_import_job():
    db = SessionLocal()
    try:
        search = settings.openfda_ndc_search
        api_key = settings.openfda_api_key
        limit = settings.openfda_ndc_limit
        skip_state = _get_state(db, "openfda_ndc_skip")
        skip = int(skip_state) if skip_state is not None else 0
    
        # call openFDA NDC similar to the endpoint
        url = "https://api.fda.gov/drug/ndc.json"
        params = {"search": search, "limit": min(limit, 100), "skip": max(skip, 0)}
        if api_key:
            params["api_key"] = api_key
        try:
            data = fetch_json(url, params)
        except Exception as e:
            logger.error(f"job_failed source=openfda_ndc error={str(e)}")
            return
    
        results = data.get("results", []) or []
        received = len(results)
        imported = 0
        updated = 0
        for item in results:
            ndc = item.get("product_ndc")
            if not ndc:
                continue
            product_name = item.get("brand_name") or item.get("brand_name_base") or item.get("generic_name") or "Unknown"
            generic_name = item.get("generic_name")
            manufacturer = item.get("labeler_name") or ", ".join(item.get("openfda", {}).get("manufacturer_name", []) or []) or ""
            dosage_form = item.get("dosage_form")
            route = item.get("route")
            route_of_administration = ",".join(route) if isinstance(route, list) else route
            existing = db.query(DrugModel).filter(DrugModel.ndc == ndc).first()
            if existing:
                existing.product_name = product_name
                existing.generic_name = generic_name
                existing.manufacturer = manufacturer or existing.manufacturer
                existing.dosage_form = dosage_form
                existing.route_of_administration = route_of_administration
                db.add(existing)
                updated += 1
            else:
                db.add(DrugModel(
                    ndc=ndc,
                    product_name=product_name,
                    generic_name=generic_name,
                    manufacturer=manufacturer or "",
                    dosage_form=dosage_form,
                    route_of_administration=route_of_administration,
                ))
                imported += 1
            upsert_drug_ingredients(db, ndc, item.get("active_ingredients"))
        db.commit()
    
        # advance skip; if fewer than limit received, reset to 0
        next_skip = 0 if received < min(limit, 100) else (skip + received)
        _set_state(db, "openfda_ndc_skip", str(next_skip))
        stats = {"received": received, "imported": imported, "updated": updated, "skip": next_skip}
        _set_state(db, "stats:job_openfda_ndc", json.dumps(stats))
        logger.info(f"job_complete source=openfda_ndc received={received} imported={imported} updated={updated} next_skip={next_skip}")
    finally:
        db.close()


def run_label_enrich_job():
    db = SessionLocal()
    try:
        api_key = settings.openfda_api_key
        batch = settings.openfda_label_enrich_batch
        # pick a batch of drugs missing labels
        candidates = db.query(DrugModel).filter(
            (DrugModel.indications_and_usage.is_(None)) | (DrugModel.adverse_reactions.is_(None)) | (DrugModel.warnings.is_(None))
        ).limit(batch).all()
        enriched = 0
        attempted = 0
        for d in candidates:
            attempted += 1
            try:
                url = "https://api.fda.gov/drug/label.json"
                params = {"search": f"openfda.product_ndc:{d.ndc}", "limit": 1}
                if api_key:
                    params["api_key"] = api_key
                data = fetch_json(url, params)
                results = data.get("results", []) or []
                if not results:
                    continue
                doc = results[0]
                def extract_text(v):
                    if v is None:
                        return None
                    if isinstance(v, list):
                        return "\n\n".join([str(x) for x in v if x])
                    return str(v)
                indications = extract_text(doc.get("indications_and_usage"))
                adverse = extract_text(doc.get("adverse_reactions"))
                warnings_text = extract_text(doc.get("warnings")) or extract_text(doc.get("warnings_and_cautions"))
                if indications:
                    d.indications_and_usage = indications
                if adverse:
                    d.adverse_reactions = adverse
                if warnings_text:
                    d.warnings = warnings_text
                db.add(d)
                enriched += 1
            except Exception:
                continue
        db.commit()
        stats = {"attempted": attempted, "enriched": enriched}
        _set_state(db, "stats:job_openfda_label", json.dumps(stats))
        logger.info(f"job_complete source=openfda_label attempted={attempted} enriched={enriched}")
    finally:
        db.close()

@app.on_event("startup")
async def start_scheduler():
-    # Guard: enable only when explicitly requested (e.g., in a dedicated scheduler process)
-    if os.getenv("ENABLE_SCHEDULER", "0").lower() not in ("1", "true", "yes"):
-        return
-    # Initialize scheduler with cron from env vars; defaults: daily at 02:00 and 02:30 UTC
-    scheduler = AsyncIOScheduler(timezone="UTC")
-    ndc_cron = os.getenv("SCHEDULE_OPENFDA_NDC_CRON", "0 2 * * *")
-    label_cron = os.getenv("SCHEDULE_OPENFDA_LABEL_CRON", "30 2 * * *")
-    try:
-        scheduler.add_job(run_ndc_import_job, CronTrigger.from_crontab(ndc_cron), id="ndc_import", replace_existing=True)
-        scheduler.add_job(run_label_enrich_job, CronTrigger.from_crontab(label_cron), id="label_enrich", replace_existing=True)
-        scheduler.start()
-        # store to app state so it can be inspected if needed
-        app.state.scheduler = scheduler
-        logger.info("scheduler_started")
-    except Exception as e:
-        # fail silently to avoid crashing the API if scheduler cannot start
-        logger.error(f"scheduler_start_failed error={str(e)}")
-        pass
+@app.on_event("startup")
+def bootstrap_data():
+    # Run lightweight SQLite migrations, then backfill normalized synonyms
+    db = SessionLocal()
+    try:
+        conn = engine.connect()
+        try:
+            if engine.dialect.name == "sqlite":
+                # Ensure a simple schema_migrations table exists
+                conn.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER NOT NULL)"))
+                res = conn.execute(text("SELECT version FROM schema_migrations LIMIT 1")).fetchone()
+                if res is None:
+                    conn.execute(text("INSERT INTO schema_migrations (version) VALUES (1)"))
+                    current_version = 1
+                else:
+                    current_version = int(res[0] or 1)
+                target_version = 2
+                if current_version < target_version:
+                    # Helper to get column type from PRAGMA
+                    def col_type(table: str, col: str) -> Optional[str]:
+                        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
+                        for r in rows:
+                            # row: (cid, name, type, notnull, dflt_value, pk)
+                            if (r[1] or "").lower() == col.lower():
+                                return (r[2] or "").upper()
+                        return None
+                    # Check drugs table
+                    try:
+                        t1 = col_type("drugs", "indications_and_usage")
+                        t2 = col_type("drugs", "adverse_reactions")
+                        t3 = col_type("drugs", "warnings")
+                        need_drugs = any(t not in (None, "TEXT") for t in (t1, t2, t3))
+                    except Exception:
+                        need_drugs = False
+                    if need_drugs:
+                        logger.info("migrating_table table=drugs to_text_fields=true")
+                        conn.execute(text(
+                            """
+                            CREATE TABLE IF NOT EXISTS drugs_new (
+                                id INTEGER PRIMARY KEY,
+                                ndc VARCHAR NOT NULL UNIQUE,
+                                product_name VARCHAR NOT NULL,
+                                generic_name VARCHAR,
+                                manufacturer VARCHAR NOT NULL,
+                                dosage_form VARCHAR,
+                                route_of_administration VARCHAR,
+                                indications_and_usage TEXT,
+                                adverse_reactions TEXT,
+                                warnings TEXT
+                            )
+                            """
+                        ))
+                        conn.execute(text(
+                            """
+                            INSERT INTO drugs_new (
+                                id, ndc, product_name, generic_name, manufacturer,
+                                dosage_form, route_of_administration,
+                                indications_and_usage, adverse_reactions, warnings
+                            )
+                            SELECT id, ndc, product_name, generic_name, manufacturer,
+                                   dosage_form, route_of_administration,
+                                   indications_and_usage, adverse_reactions, warnings
+                            FROM drugs
+                            """
+                        ))
+                        conn.execute(text("DROP TABLE drugs"))
+                        conn.execute(text("ALTER TABLE drugs_new RENAME TO drugs"))
+                        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_drugs_product_name ON drugs (product_name)"))
+                        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_drugs_generic_name ON drugs (generic_name)"))
+                    # Check diagnoses table
+                    try:
+                        td = col_type("diagnoses", "description")
+                        need_diag = td not in (None, "TEXT")
+                    except Exception:
+                        need_diag = False
+                    if need_diag:
+                        logger.info("migrating_table table=diagnoses description_to_text=true")
+                        conn.execute(text(
+                            """
+                            CREATE TABLE IF NOT EXISTS diagnoses_new (
+                                id INTEGER PRIMARY KEY,
+                                condition_name VARCHAR NOT NULL,
+                                icd10_code VARCHAR NOT NULL,
+                                icd9_code VARCHAR,
+                                synonyms VARCHAR,
+                                description TEXT
+                            )
+                            """
+                        ))
+                        conn.execute(text(
+                            """
+                            INSERT INTO diagnoses_new (
+                                id, condition_name, icd10_code, icd9_code, synonyms, description
+                            )
+                            SELECT id, condition_name, icd10_code, icd9_code, synonyms, description
+                            FROM diagnoses
+                            """
+                        ))
+                        conn.execute(text("DROP TABLE diagnoses"))
+                        conn.execute(text("ALTER TABLE diagnoses_new RENAME TO diagnoses"))
+                        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_diagnoses_condition_name ON diagnoses (condition_name)"))
+                        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_diagnoses_icd10_code ON diagnoses (icd10_code)"))
+                    # Ensure new tables exist after migrations
+                    Base.metadata.create_all(bind=engine)
+                    conn.execute(text("UPDATE schema_migrations SET version = :v"), {"v": target_version})
+                    logger.info("migration_complete version=%s" % target_version)
+            # Backfill normalized synonyms once
+            try:
+                existing = db.query(DiagnosisSynonymModel).count()
+            except Exception:
+                existing = 0
+            if existing == 0:
+                for d in db.query(DiagnosisModel).all():
+                    syns = csv_to_list(d.synonyms)
+                    if syns:
+                        upsert_diagnosis_synonyms(db, d.id, syns)
+                db.commit()
+        finally:
+            conn.close()
+    except Exception as e:
+        logger.error(f"bootstrap_failed error={e}")
+    finally:
+        db.close()

@app.post("/import/openfda/label")
def import_openfda_label(
    ndc: Optional[str] = Query(None, description="If provided, enrich label data for this NDC only"),
    search: Optional[str] = Query(None, description="openFDA search query for drug/label endpoint; used when ndc not provided"),
    limit: int = Query(50, ge=1, le=100, description="Number of label docs to fetch"),
    api_key: Optional[str] = Query(None, description="Optional openFDA API key"),
    db: Session = Depends(get_db),
):
    url = "https://api.fda.gov/drug/label.json"
    params: dict = {"limit": min(limit, 100)}
    if ndc:
        params["search"] = f"openfda.product_ndc:{ndc}"
    elif search:
        params["search"] = search
    else:
        raise HTTPException(status_code=400, detail="Provide either ndc or search query")
    if api_key:
        params["api_key"] = api_key

    try:
        data = fetch_json(url, params)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"openFDA request failed: {str(e)}")

    results = data.get("results", []) or []
    enriched = 0
    skipped = 0
    updated_ndcs: List[str] = []
    errors: List[str] = []

    def extract_text(value) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, list):
            return "\n\n".join([str(v) for v in value if v])
        return str(value)

    for item in results:
        try:
            openfda = item.get("openfda", {}) or {}
            ndcs = openfda.get("product_ndc") or []
            if ndc and ndc not in ndcs:
                ndcs = [ndc]
            if not ndcs:
                skipped += 1
                continue

            indications = extract_text(item.get("indications_and_usage"))
            adverse = extract_text(item.get("adverse_reactions"))
            warnings_text = extract_text(item.get("warnings")) or extract_text(item.get("warnings_and_cautions"))

            for n in ndcs:
                existing = db.query(DrugModel).filter(DrugModel.ndc == n).first()
                if not existing:
                    # Only enrich already-imported drugs
                    continue
                if indications:
                    existing.indications_and_usage = indications
                if adverse:
                    existing.adverse_reactions = adverse
                if warnings_text:
                    existing.warnings = warnings_text
                db.add(existing)
                enriched += 1
                updated_ndcs.append(n)
        except Exception as ex:
            errors.append(str(ex))
            skipped += 1

    db.commit()

    return {
        "source": "openfda_label",
        "received": len(results),
        "enriched": enriched,
        "skipped": skipped,
        "updated_ndcs": list(sorted(set(updated_ndcs)))[:20],
        "errors": errors[:5],
    }


@app.get("/metrics")
def metrics(db: Session = Depends(get_db)):
    counts = {
        "drugs": db.query(DrugModel).count(),
        "drug_ingredients": db.query(DrugIngredientModel).count(),
        "diagnoses": db.query(DiagnosisModel).count(),
        "diagnosis_synonyms": db.query(DiagnosisSynonymModel).count(),
    }
    keys = [
        "stats:openfda_ndc",
        "stats:clinicaltables_conditions",
        "stats:job_openfda_ndc",
        "stats:job_openfda_label",
    ]
    last_stats = {}
    for k in keys:
        rec = db.query(ImportStateModel).filter(ImportStateModel.key == k).first()
        if rec and rec.value:
            try:
                last_stats[k] = json.loads(rec.value)
            except Exception:
                last_stats[k] = {"raw": rec.value}
    return {"counts": counts, "stats": last_stats}