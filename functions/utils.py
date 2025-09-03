"""Utility functions for Firebase Cloud Functions"""

import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from firebase_admin import firestore, auth
import requests
from functools import wraps

logger = logging.getLogger(__name__)

def require_auth(f):
    """Decorator to require authentication for Cloud Functions"""
    @wraps(f)
    def decorated_function(req):
        # Get the Authorization header
        auth_header = req.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return {'error': 'Unauthorized'}, 401
        
        try:
            # Verify the ID token
            id_token = auth_header.split('Bearer ')[1]
            decoded_token = auth.verify_id_token(id_token)
            req.user = decoded_token
            return f(req)
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return {'error': 'Invalid token'}, 401
    
    return decorated_function

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone: str) -> bool:
    """Validate phone number format"""
    pattern = r'^\+?1?\d{9,15}$'
    return re.match(pattern, phone) is not None

def sanitize_input(data: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks"""
    if not isinstance(data, str):
        return str(data)
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', 'javascript:', 'data:', 'vbscript:']
    sanitized = data
    
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    
    return sanitized.strip()

def validate_drug_data(drug_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize drug data"""
    required_fields = ['name', 'generic_name', 'description']
    errors = []
    
    for field in required_fields:
        if field not in drug_data or not drug_data[field]:
            errors.append(f"Missing required field: {field}")
    
    if errors:
        return {'valid': False, 'errors': errors}
    
    # Sanitize string fields
    string_fields = ['name', 'generic_name', 'description', 'manufacturer', 'dosage_form']
    for field in string_fields:
        if field in drug_data and isinstance(drug_data[field], str):
            drug_data[field] = sanitize_input(drug_data[field])
    
    return {'valid': True, 'data': drug_data}

def validate_review_data(review_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize review data"""
    required_fields = ['drug_id', 'rating', 'review_text']
    errors = []
    
    for field in required_fields:
        if field not in review_data or review_data[field] is None:
            errors.append(f"Missing required field: {field}")
    
    # Validate rating
    if 'rating' in review_data:
        try:
            rating = float(review_data['rating'])
            if rating < 1 or rating > 5:
                errors.append("Rating must be between 1 and 5")
        except (ValueError, TypeError):
            errors.append("Rating must be a valid number")
    
    # Validate review text length
    if 'review_text' in review_data:
        review_text = str(review_data['review_text'])
        if len(review_text) < 10:
            errors.append("Review text must be at least 10 characters long")
        elif len(review_text) > 2000:
            errors.append("Review text must be less than 2000 characters")
        
        # Sanitize review text
        review_data['review_text'] = sanitize_input(review_text)
    
    if errors:
        return {'valid': False, 'errors': errors}
    
    return {'valid': True, 'data': review_data}

def rate_limit_check(user_id: str, action: str, limit: int = 10, window_minutes: int = 60) -> bool:
    """Check if user has exceeded rate limit for a specific action"""
    try:
        db = firestore.client()
        now = datetime.now(timezone.utc)
        window_start = now.replace(minute=now.minute - (now.minute % window_minutes), second=0, microsecond=0)
        
        # Check rate limit document
        rate_limit_ref = db.collection('rate_limits').document(f"{user_id}_{action}_{window_start.isoformat()}")
        rate_limit_doc = rate_limit_ref.get()
        
        if rate_limit_doc.exists:
            current_count = rate_limit_doc.to_dict().get('count', 0)
            if current_count >= limit:
                return False
            
            # Increment count
            rate_limit_ref.update({'count': current_count + 1})
        else:
            # Create new rate limit document
            rate_limit_ref.set({
                'count': 1,
                'window_start': window_start,
                'user_id': user_id,
                'action': action
            })
        
        return True
    except Exception as e:
        logger.error(f"Rate limit check error: {e}")
        return True  # Allow on error to avoid blocking legitimate users

def log_user_activity(user_id: str, action: str, details: Optional[Dict[str, Any]] = None):
    """Log user activity for analytics and security"""
    try:
        db = firestore.client()
        activity_data = {
            'user_id': user_id,
            'action': action,
            'timestamp': datetime.now(timezone.utc),
            'details': details or {}
        }
        
        db.collection('user_activities').add(activity_data)
    except Exception as e:
        logger.error(f"Failed to log user activity: {e}")

def get_external_drug_info(drug_name: str) -> Optional[Dict[str, Any]]:
    """Fetch drug information from external APIs"""
    try:
        # FDA API for drug information
        fda_url = f"https://api.fda.gov/drug/label.json?search=openfda.brand_name:{drug_name}&limit=1"
        
        response = requests.get(fda_url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'results' in data and len(data['results']) > 0:
                result = data['results'][0]
                return {
                    'source': 'FDA',
                    'brand_name': result.get('openfda', {}).get('brand_name', []),
                    'generic_name': result.get('openfda', {}).get('generic_name', []),
                    'manufacturer_name': result.get('openfda', {}).get('manufacturer_name', []),
                    'dosage_form': result.get('openfda', {}).get('dosage_form', []),
                    'route': result.get('openfda', {}).get('route', []),
                    'warnings': result.get('warnings', []),
                    'indications_and_usage': result.get('indications_and_usage', [])
                }
    except Exception as e:
        logger.error(f"Error fetching external drug info: {e}")
    
    return None

def search_drug_interactions(drug_names: List[str]) -> Dict[str, Any]:
    """Search for drug interactions using external APIs"""
    try:
        # This would integrate with a drug interaction API
        # For now, return a placeholder structure
        interactions = []
        
        for i, drug1 in enumerate(drug_names):
            for drug2 in drug_names[i+1:]:
                # Placeholder interaction check
                interactions.append({
                    'drug1': drug1,
                    'drug2': drug2,
                    'severity': 'unknown',
                    'description': 'Interaction data not available',
                    'source': 'placeholder'
                })
        
        return {
            'interactions': interactions,
            'total_count': len(interactions),
            'disclaimer': 'This information is for educational purposes only. Consult healthcare professionals for medical advice.'
        }
    except Exception as e:
        logger.error(f"Error searching drug interactions: {e}")
        return {'interactions': [], 'total_count': 0, 'error': str(e)}

def calculate_drug_rating(drug_id: str) -> float:
    """Calculate average rating for a drug based on reviews"""
    try:
        db = firestore.client()
        reviews_ref = db.collection('drug_reviews').where('drug_id', '==', drug_id)
        reviews = reviews_ref.get()
        
        if not reviews:
            return 0.0
        
        total_rating = 0
        count = 0
        
        for review in reviews:
            review_data = review.to_dict()
            if 'rating' in review_data:
                total_rating += float(review_data['rating'])
                count += 1
        
        return round(total_rating / count, 2) if count > 0 else 0.0
    except Exception as e:
        logger.error(f"Error calculating drug rating: {e}")
        return 0.0

def format_api_response(data: Any, success: bool = True, message: str = "") -> Dict[str, Any]:
    """Format consistent API response structure"""
    return {
        'success': success,
        'message': message,
        'data': data,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }

def handle_api_error(error: Exception, context: str = "") -> Dict[str, Any]:
    """Handle and format API errors consistently"""
    error_message = f"{context}: {str(error)}" if context else str(error)
    logger.error(error_message)
    
    return format_api_response(
        data=None,
        success=False,
        message=error_message
    )

def validate_pagination_params(page: int, limit: int) -> Dict[str, Any]:
    """Validate pagination parameters"""
    errors = []
    
    if page < 1:
        errors.append("Page must be greater than 0")
    
    if limit < 1 or limit > 100:
        errors.append("Limit must be between 1 and 100")
    
    if errors:
        return {'valid': False, 'errors': errors}
    
    return {'valid': True, 'page': page, 'limit': limit}

def create_search_index_terms(text: str) -> List[str]:
    """Create search index terms for full-text search"""
    if not text:
        return []
    
    # Convert to lowercase and split into words
    words = re.findall(r'\b\w+\b', text.lower())
    
    # Create all possible substrings for partial matching
    terms = set()
    for word in words:
        for i in range(len(word)):
            for j in range(i + 1, len(word) + 1):
                if j - i >= 2:  # Minimum 2 characters
                    terms.add(word[i:j])
    
    return list(terms)