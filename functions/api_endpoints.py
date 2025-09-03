"""Additional API endpoints for the Medical Information Application"""

from firebase_functions import https_fn, options
from firebase_admin import firestore, auth
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import requests
from utils import (
    validate_drug_data, validate_review_data, rate_limit_check,
    log_user_activity, get_external_drug_info, search_drug_interactions,
    calculate_drug_rating, format_api_response, handle_api_error,
    validate_pagination_params, create_search_index_terms, require_auth
)

logger = logging.getLogger(__name__)
db = firestore.client()

# CORS configuration
cors_options = options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    cors_allow_credentials=True
)

@https_fn.on_request(cors=cors_options)
def search_drugs(req: https_fn.Request) -> https_fn.Response:
    """Advanced drug search with filters and sorting"""
    try:
        # Parse query parameters
        query = req.args.get('q', '').strip()
        category = req.args.get('category', '')
        manufacturer = req.args.get('manufacturer', '')
        dosage_form = req.args.get('dosage_form', '')
        sort_by = req.args.get('sort_by', 'name')  # name, rating, created_at
        sort_order = req.args.get('sort_order', 'asc')  # asc, desc
        page = int(req.args.get('page', 1))
        limit = int(req.args.get('limit', 20))
        
        # Validate pagination
        pagination_validation = validate_pagination_params(page, limit)
        if not pagination_validation['valid']:
            return format_api_response(
                data=None,
                success=False,
                message='; '.join(pagination_validation['errors'])
            ), 400
        
        # Build Firestore query
        drugs_ref = db.collection('drugs')
        
        # Apply filters
        if category:
            drugs_ref = drugs_ref.where('category', '==', category)
        if manufacturer:
            drugs_ref = drugs_ref.where('manufacturer', '==', manufacturer)
        if dosage_form:
            drugs_ref = drugs_ref.where('dosage_form', '==', dosage_form)
        
        # Apply text search if query provided
        if query:
            search_terms = create_search_index_terms(query)
            if search_terms:
                drugs_ref = drugs_ref.where('search_terms', 'array_contains_any', search_terms[:10])
        
        # Apply sorting
        if sort_order == 'desc':
            drugs_ref = drugs_ref.order_by(sort_by, direction=firestore.Query.DESCENDING)
        else:
            drugs_ref = drugs_ref.order_by(sort_by)
        
        # Apply pagination
        offset = (page - 1) * limit
        drugs_ref = drugs_ref.offset(offset).limit(limit)
        
        # Execute query
        drugs = drugs_ref.get()
        
        # Format results
        results = []
        for drug in drugs:
            drug_data = drug.to_dict()
            drug_data['id'] = drug.id
            
            # Add calculated rating
            drug_data['average_rating'] = calculate_drug_rating(drug.id)
            
            results.append(drug_data)
        
        # Get total count for pagination
        total_query = db.collection('drugs')
        if category:
            total_query = total_query.where('category', '==', category)
        if manufacturer:
            total_query = total_query.where('manufacturer', '==', manufacturer)
        if dosage_form:
            total_query = total_query.where('dosage_form', '==', dosage_form)
        
        total_count = len(total_query.get())
        
        return format_api_response({
            'drugs': results,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_count,
                'pages': (total_count + limit - 1) // limit
            },
            'filters': {
                'query': query,
                'category': category,
                'manufacturer': manufacturer,
                'dosage_form': dosage_form
            }
        })
        
    except Exception as e:
        return handle_api_error(e, "Drug search failed"), 500

@https_fn.on_request(cors=cors_options)
@require_auth
def add_drug(req: https_fn.Request) -> https_fn.Response:
    """Add a new drug to the database (admin only)"""
    try:
        # Check if user is admin
        user_claims = req.user.get('custom_claims', {})
        if not user_claims.get('admin', False):
            return format_api_response(
                data=None,
                success=False,
                message="Admin access required"
            ), 403
        
        # Rate limiting
        if not rate_limit_check(req.user['uid'], 'add_drug', limit=5, window_minutes=60):
            return format_api_response(
                data=None,
                success=False,
                message="Rate limit exceeded"
            ), 429
        
        # Parse request data
        drug_data = req.get_json()
        if not drug_data:
            return format_api_response(
                data=None,
                success=False,
                message="No data provided"
            ), 400
        
        # Validate drug data
        validation = validate_drug_data(drug_data)
        if not validation['valid']:
            return format_api_response(
                data=None,
                success=False,
                message='; '.join(validation['errors'])
            ), 400
        
        validated_data = validation['data']
        
        # Add metadata
        validated_data.update({
            'created_at': datetime.now(timezone.utc),
            'created_by': req.user['uid'],
            'updated_at': datetime.now(timezone.utc),
            'search_terms': create_search_index_terms(
                f"{validated_data.get('name', '')} {validated_data.get('generic_name', '')} {validated_data.get('description', '')}"
            ),
            'average_rating': 0.0,
            'review_count': 0,
            'status': 'active'
        })
        
        # Try to get external drug information
        external_info = get_external_drug_info(validated_data['name'])
        if external_info:
            validated_data['external_info'] = external_info
        
        # Add to Firestore
        drug_ref = db.collection('drugs').add(validated_data)
        
        # Log activity
        log_user_activity(req.user['uid'], 'add_drug', {
            'drug_id': drug_ref[1].id,
            'drug_name': validated_data['name']
        })
        
        return format_api_response({
            'drug_id': drug_ref[1].id,
            'message': 'Drug added successfully'
        })
        
    except Exception as e:
        return handle_api_error(e, "Failed to add drug"), 500

@https_fn.on_request(cors=cors_options)
def get_drug_interactions(req: https_fn.Request) -> https_fn.Response:
    """Get drug interactions for multiple drugs"""
    try:
        # Parse request data
        if req.method == 'POST':
            data = req.get_json()
            drug_names = data.get('drugs', []) if data else []
        else:
            # GET request with comma-separated drug names
            drugs_param = req.args.get('drugs', '')
            drug_names = [name.strip() for name in drugs_param.split(',') if name.strip()]
        
        if not drug_names:
            return format_api_response(
                data=None,
                success=False,
                message="No drugs provided"
            ), 400
        
        if len(drug_names) > 10:
            return format_api_response(
                data=None,
                success=False,
                message="Maximum 10 drugs allowed"
            ), 400
        
        # Search for interactions
        interactions = search_drug_interactions(drug_names)
        
        return format_api_response(interactions)
        
    except Exception as e:
        return handle_api_error(e, "Failed to get drug interactions"), 500

@https_fn.on_request(cors=cors_options)
@require_auth
def get_user_bookmarks(req: https_fn.Request) -> https_fn.Response:
    """Get user's bookmarked drugs"""
    try:
        user_id = req.user['uid']
        page = int(req.args.get('page', 1))
        limit = int(req.args.get('limit', 20))
        
        # Validate pagination
        pagination_validation = validate_pagination_params(page, limit)
        if not pagination_validation['valid']:
            return format_api_response(
                data=None,
                success=False,
                message='; '.join(pagination_validation['errors'])
            ), 400
        
        # Get user's bookmarks
        bookmarks_ref = db.collection('user_bookmarks').where('user_id', '==', user_id)
        bookmarks = bookmarks_ref.get()
        
        # Get drug IDs
        drug_ids = [bookmark.to_dict()['drug_id'] for bookmark in bookmarks]
        
        if not drug_ids:
            return format_api_response({
                'bookmarks': [],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': 0,
                    'pages': 0
                }
            })
        
        # Get drug details with pagination
        offset = (page - 1) * limit
        paginated_drug_ids = drug_ids[offset:offset + limit]
        
        drugs = []
        for drug_id in paginated_drug_ids:
            drug_doc = db.collection('drugs').document(drug_id).get()
            if drug_doc.exists:
                drug_data = drug_doc.to_dict()
                drug_data['id'] = drug_doc.id
                drug_data['average_rating'] = calculate_drug_rating(drug_doc.id)
                drugs.append(drug_data)
        
        return format_api_response({
            'bookmarks': drugs,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': len(drug_ids),
                'pages': (len(drug_ids) + limit - 1) // limit
            }
        })
        
    except Exception as e:
        return handle_api_error(e, "Failed to get user bookmarks"), 500

@https_fn.on_request(cors=cors_options)
@require_auth
def toggle_bookmark(req: https_fn.Request) -> https_fn.Response:
    """Add or remove a drug bookmark"""
    try:
        user_id = req.user['uid']
        
        # Parse request data
        data = req.get_json()
        if not data or 'drug_id' not in data:
            return format_api_response(
                data=None,
                success=False,
                message="Drug ID is required"
            ), 400
        
        drug_id = data['drug_id']
        
        # Check if drug exists
        drug_doc = db.collection('drugs').document(drug_id).get()
        if not drug_doc.exists:
            return format_api_response(
                data=None,
                success=False,
                message="Drug not found"
            ), 404
        
        # Check if bookmark exists
        bookmark_query = db.collection('user_bookmarks').where('user_id', '==', user_id).where('drug_id', '==', drug_id)
        existing_bookmarks = bookmark_query.get()
        
        if existing_bookmarks:
            # Remove bookmark
            for bookmark in existing_bookmarks:
                bookmark.reference.delete()
            
            action = 'removed'
            log_user_activity(user_id, 'remove_bookmark', {'drug_id': drug_id})
        else:
            # Add bookmark
            bookmark_data = {
                'user_id': user_id,
                'drug_id': drug_id,
                'created_at': datetime.now(timezone.utc)
            }
            db.collection('user_bookmarks').add(bookmark_data)
            
            action = 'added'
            log_user_activity(user_id, 'add_bookmark', {'drug_id': drug_id})
        
        return format_api_response({
            'action': action,
            'drug_id': drug_id
        })
        
    except Exception as e:
        return handle_api_error(e, "Failed to toggle bookmark"), 500

@https_fn.on_request(cors=cors_options)
def get_drug_categories(req: https_fn.Request) -> https_fn.Response:
    """Get all available drug categories"""
    try:
        # Get unique categories from drugs collection
        drugs_ref = db.collection('drugs')
        drugs = drugs_ref.get()
        
        categories = set()
        manufacturers = set()
        dosage_forms = set()
        
        for drug in drugs:
            drug_data = drug.to_dict()
            
            if 'category' in drug_data and drug_data['category']:
                categories.add(drug_data['category'])
            
            if 'manufacturer' in drug_data and drug_data['manufacturer']:
                manufacturers.add(drug_data['manufacturer'])
            
            if 'dosage_form' in drug_data and drug_data['dosage_form']:
                dosage_forms.add(drug_data['dosage_form'])
        
        return format_api_response({
            'categories': sorted(list(categories)),
            'manufacturers': sorted(list(manufacturers)),
            'dosage_forms': sorted(list(dosage_forms))
        })
        
    except Exception as e:
        return handle_api_error(e, "Failed to get drug categories"), 500

@https_fn.on_request(cors=cors_options)
@require_auth
def get_user_reviews(req: https_fn.Request) -> https_fn.Response:
    """Get user's drug reviews"""
    try:
        user_id = req.user['uid']
        page = int(req.args.get('page', 1))
        limit = int(req.args.get('limit', 20))
        
        # Validate pagination
        pagination_validation = validate_pagination_params(page, limit)
        if not pagination_validation['valid']:
            return format_api_response(
                data=None,
                success=False,
                message='; '.join(pagination_validation['errors'])
            ), 400
        
        # Get user's reviews with pagination
        offset = (page - 1) * limit
        reviews_ref = db.collection('drug_reviews').where('user_id', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING).offset(offset).limit(limit)
        reviews = reviews_ref.get()
        
        # Get total count
        total_reviews_ref = db.collection('drug_reviews').where('user_id', '==', user_id)
        total_count = len(total_reviews_ref.get())
        
        # Format results with drug information
        results = []
        for review in reviews:
            review_data = review.to_dict()
            review_data['id'] = review.id
            
            # Get drug information
            drug_doc = db.collection('drugs').document(review_data['drug_id']).get()
            if drug_doc.exists:
                drug_data = drug_doc.to_dict()
                review_data['drug'] = {
                    'id': drug_doc.id,
                    'name': drug_data.get('name', ''),
                    'generic_name': drug_data.get('generic_name', '')
                }
            
            results.append(review_data)
        
        return format_api_response({
            'reviews': results,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_count,
                'pages': (total_count + limit - 1) // limit
            }
        })
        
    except Exception as e:
        return handle_api_error(e, "Failed to get user reviews"), 500

@https_fn.on_request(cors=cors_options)
def get_popular_drugs(req: https_fn.Request) -> https_fn.Response:
    """Get popular drugs based on reviews and ratings"""
    try:
        limit = int(req.args.get('limit', 10))
        category = req.args.get('category', '')
        
        if limit > 50:
            limit = 50
        
        # Build query
        drugs_ref = db.collection('drugs')
        
        if category:
            drugs_ref = drugs_ref.where('category', '==', category)
        
        # Order by review count and rating
        drugs_ref = drugs_ref.where('review_count', '>', 0).order_by('review_count', direction=firestore.Query.DESCENDING).limit(limit)
        
        drugs = drugs_ref.get()
        
        # Format results
        results = []
        for drug in drugs:
            drug_data = drug.to_dict()
            drug_data['id'] = drug.id
            drug_data['average_rating'] = calculate_drug_rating(drug.id)
            results.append(drug_data)
        
        # Sort by average rating if multiple drugs have same review count
        results.sort(key=lambda x: (x.get('review_count', 0), x.get('average_rating', 0)), reverse=True)
        
        return format_api_response({
            'popular_drugs': results,
            'category': category,
            'limit': limit
        })
        
    except Exception as e:
        return handle_api_error(e, "Failed to get popular drugs"), 500