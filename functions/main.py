from firebase_functions import https_fn, firestore_fn, options
from firebase_admin import initialize_app, firestore, auth
import json
import logging
from typing import Any, Dict
from datetime import datetime
import requests
from functools import wraps
from utils import require_auth, format_api_response, handle_api_error, log_user_activity

# Initialize Firebase Admin SDK
app = initialize_app()
db = firestore.client()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CORS configuration
cors_options = options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    cors_allow_credentials=True
)

# Authentication decorator is now imported from utils.py

@https_fn.on_request(cors=cors_options)
def get_drugs(req: https_fn.Request) -> https_fn.Response:
    """Get drugs from Firestore with pagination and filtering"""
    try:
        # Parse query parameters
        page = int(req.args.get('page', 1))
        limit = min(int(req.args.get('limit', 20)), 100)  # Max 100 items per page
        category = req.args.get('category')
        search = req.args.get('search')
        
        # Build query
        query = db.collection('drugs')
        
        if category:
            query = query.where('category', '==', category)
        
        if search:
            # Simple text search (for production, consider using Algolia or Elasticsearch)
            query = query.where('name', '>=', search).where('name', '<=', search + '\uf8ff')
        
        # Add ordering and pagination
        query = query.order_by('name').limit(limit).offset((page - 1) * limit)
        
        # Execute query
        docs = query.stream()
        drugs = []
        for doc in docs:
            drug_data = doc.to_dict()
            drug_data['id'] = doc.id
            drugs.append(drug_data)
        
        return {
            'drugs': drugs,
            'page': page,
            'limit': limit,
            'total': len(drugs)
        }
    
    except Exception as e:
        logger.error(f"Error fetching drugs: {e}")
        return {'error': 'Internal server error'}, 500

@https_fn.on_request(cors=cors_options)
@require_auth
def create_drug_review(req: https_fn.Request) -> https_fn.Response:
    """Create a new drug review"""
    try:
        if req.method != 'POST':
            return {'error': 'Method not allowed'}, 405
        
        data = req.get_json()
        drug_id = data.get('drug_id')
        rating = data.get('rating')
        comment = data.get('comment', '')
        
        # Validate input
        if not drug_id or not rating or rating < 1 or rating > 5:
            return {'error': 'Invalid input'}, 400
        
        # Create review document
        review_data = {
            'drug_id': drug_id,
            'user_id': req.user['uid'],
            'user_email': req.user.get('email', ''),
            'rating': rating,
            'comment': comment,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Add to Firestore
        doc_ref = db.collection('drug_reviews').add(review_data)
        
        return {
            'success': True,
            'review_id': doc_ref[1].id,
            'message': 'Review created successfully'
        }
    
    except Exception as e:
        logger.error(f"Error creating review: {e}")
        return {'error': 'Internal server error'}, 500

@https_fn.on_request(cors=cors_options)
def search_icd10(req: https_fn.Request) -> https_fn.Response:
    """Search ICD-10 codes using external API"""
    try:
        query = req.args.get('q', '')
        if not query:
            return {'error': 'Query parameter required'}, 400
        
        # Use NIH Clinical Tables API for ICD-10 search
        api_url = f"https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms={query}"
        
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Format response
        results = []
        if len(data) > 3 and data[3]:
            for item in data[3]:
                if len(item) >= 2:
                    results.append({
                        'code': item[0],
                        'name': item[1]
                    })
        
        return {
            'results': results,
            'total': len(results)
        }
    
    except requests.RequestException as e:
        logger.error(f"External API error: {e}")
        return {'error': 'External service unavailable'}, 503
    except Exception as e:
        logger.error(f"Error searching ICD-10: {e}")
        return {'error': 'Internal server error'}, 500

@https_fn.on_request(cors=cors_options)
@require_auth
def get_user_profile(req: https_fn.Request) -> https_fn.Response:
    """Get user profile data"""
    try:
        user_id = req.user['uid']
        
        # Get user document
        user_doc = db.collection('users').document(user_id).get()
        
        if not user_doc.exists:
            # Create default user profile
            user_data = {
                'email': req.user.get('email', ''),
                'name': req.user.get('name', ''),
                'created_at': datetime.utcnow(),
                'preferences': {
                    'theme': 'light',
                    'notifications': True
                }
            }
            db.collection('users').document(user_id).set(user_data)
        else:
            user_data = user_doc.to_dict()
        
        # Remove sensitive data
        user_data.pop('password', None)
        user_data['id'] = user_id
        
        return user_data
    
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")
        return {'error': 'Internal server error'}, 500

@https_fn.on_request(cors=cors_options)
@require_auth
def update_user_preferences(req: https_fn.Request) -> https_fn.Response:
    """Update user preferences"""
    try:
        if req.method != 'PUT':
            return {'error': 'Method not allowed'}, 405
        
        user_id = req.user['uid']
        data = req.get_json()
        
        # Validate preferences
        allowed_preferences = ['theme', 'notifications', 'language']
        preferences = {k: v for k, v in data.items() if k in allowed_preferences}
        
        if not preferences:
            return {'error': 'No valid preferences provided'}, 400
        
        # Update user preferences
        db.collection('users').document(user_id).update({
            'preferences': preferences,
            'updated_at': datetime.utcnow()
        })
        
        return {
            'success': True,
            'message': 'Preferences updated successfully'
        }
    
    except Exception as e:
        logger.error(f"Error updating preferences: {e}")
        return {'error': 'Internal server error'}, 500

@firestore_fn.on_document_created(document="drug_reviews/{reviewId}")
def on_review_created(event: firestore_fn.CloudEvent[firestore_fn.DocumentSnapshot]) -> None:
    """Trigger when a new review is created"""
    try:
        review_data = event.data.to_dict()
        drug_id = review_data.get('drug_id')
        
        if drug_id:
            # Update drug rating average
            reviews_query = db.collection('drug_reviews').where('drug_id', '==', drug_id)
            reviews = list(reviews_query.stream())
            
            if reviews:
                total_rating = sum(review.to_dict().get('rating', 0) for review in reviews)
                average_rating = total_rating / len(reviews)
                
                # Update drug document
                db.collection('drugs').document(drug_id).update({
                    'average_rating': round(average_rating, 2),
                    'review_count': len(reviews),
                    'updated_at': datetime.utcnow()
                })
                
                logger.info(f"Updated drug {drug_id} rating: {average_rating}")
    
    except Exception as e:
        logger.error(f"Error processing review creation: {e}")

@https_fn.on_request(cors=cors_options)
def health_check(req: https_fn.Request) -> https_fn.Response:
    """Health check endpoint"""
    return {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }