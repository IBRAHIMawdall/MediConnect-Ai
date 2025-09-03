"""
MongoDB collection schemas for medical database
Based on existing SQLAlchemy models with MongoDB optimizations
"""
from pymongo import IndexModel, ASCENDING, TEXT
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# MongoDB Collection Schemas
class DrugSchema(BaseModel):
    """Drug document schema for MongoDB"""
    ndc: str
    product_name: str
    generic_name: Optional[str] = None
    manufacturer: str
    dosage_form: Optional[str] = None
    route_of_administration: Optional[str] = None
    indications_and_usage: Optional[str] = None
    adverse_reactions: Optional[str] = None
    warnings: Optional[str] = None
    active_ingredients: Optional[List[dict]] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

class DiagnosisSchema(BaseModel):
    """Diagnosis document schema for MongoDB"""
    condition_name: str
    icd10_code: str
    icd9_code: Optional[str] = None
    synonyms: Optional[List[str]] = None
    description: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

class MedicalCodeSchema(BaseModel):
    """Medical code document schema for MongoDB"""
    code: str
    code_system: str
    description: str
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

class SpecialtySchema(BaseModel):
    """Specialty document schema for MongoDB"""
    name: str
    description: Optional[str] = None
    related_diagnoses: Optional[List[str]] = None
    related_procedures: Optional[List[str]] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

class DrugIngredientSchema(BaseModel):
    """Drug ingredient document schema for MongoDB"""
    ndc: str
    name: str
    strength: Optional[str] = None
    created_at: datetime = datetime.utcnow()

class DiagnosisSynonymSchema(BaseModel):
    """Diagnosis synonym document schema for MongoDB"""
    diagnosis_id: str  # Reference to diagnosis document _id
    synonym: str
    created_at: datetime = datetime.utcnow()

class ImportStateSchema(BaseModel):
    """Import state document schema for MongoDB"""
    key: str
    value: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

# MongoDB Index Definitions
DRUG_INDEXES = [
    IndexModel([("ndc", ASCENDING)], unique=True, name="ndc_unique"),
    IndexModel([("product_name", TEXT)], name="product_name_text"),
    IndexModel([("generic_name", TEXT)], name="generic_name_text"),
    IndexModel([("manufacturer", ASCENDING)], name="manufacturer_index"),
]

DIAGNOSIS_INDEXES = [
    IndexModel([("condition_name", TEXT)], name="condition_name_text"),
    IndexModel([("icd10_code", ASCENDING)], name="icd10_code_index"),
    IndexModel([("synonyms", TEXT)], name="synonyms_text"),
]

MEDICAL_CODE_INDEXES = [
    IndexModel([("code", ASCENDING)], name="code_index"),
    IndexModel([("code_system", ASCENDING)], name="code_system_index"),
    IndexModel([("description", TEXT)], name="description_text"),
]

SPECIALTY_INDEXES = [
    IndexModel([("name", ASCENDING)], unique=True, name="name_unique"),
    IndexModel([("related_diagnoses", TEXT)], name="related_diagnoses_text"),
]

DRUG_INGREDIENT_INDEXES = [
    IndexModel([("ndc", ASCENDING), ("name", ASCENDING)], name="ndc_name_composite"),
    IndexModel([("name", ASCENDING)], name="name_index"),
]

DIAGNOSIS_SYNONYM_INDEXES = [
    IndexModel([("diagnosis_id", ASCENDING), ("synonym", ASCENDING)], unique=True, name="diagnosis_synonym_unique"),
    IndexModel([("synonym", TEXT)], name="synonym_text"),
]

IMPORT_STATE_INDEXES = [
    IndexModel([("key", ASCENDING)], unique=True, name="key_unique"),
]

# Collection configuration
COLLECTION_CONFIGS = {
    "drugs": {
        "schema": DrugSchema,
        "indexes": DRUG_INDEXES,
        "validation_level": "strict"
    },
    "diagnoses": {
        "schema": DiagnosisSchema,
        "indexes": DIAGNOSIS_INDEXES,
        "validation_level": "strict"
    },
    "medical_codes": {
        "schema": MedicalCodeSchema,
        "indexes": MEDICAL_CODE_INDEXES,
        "validation_level": "strict"
    },
    "specialties": {
        "schema": SpecialtySchema,
        "indexes": SPECIALTY_INDEXES,
        "validation_level": "strict"
    },
    "drug_ingredients": {
        "schema": DrugIngredientSchema,
        "indexes": DRUG_INGREDIENT_INDEXES,
        "validation_level": "moderate"
    },
    "diagnosis_synonyms": {
        "schema": DiagnosisSynonymSchema,
        "indexes": DIAGNOSIS_SYNONYM_INDEXES,
        "validation_level": "moderate"
    },
    "import_state": {
        "schema": ImportStateSchema,
        "indexes": IMPORT_STATE_INDEXES,
        "validation_level": "moderate"
    }
}

def get_collection_config(collection_name: str):
    """Get configuration for a specific collection"""
    return COLLECTION_CONFIGS.get(collection_name, {})