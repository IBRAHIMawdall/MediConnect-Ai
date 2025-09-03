"""
MongoDB database initialization script
Creates collections and indexes based on defined schemas
"""
import asyncio
from mongodb_utils import MongoDBConnection
from mongodb_schemas import COLLECTION_CONFIGS
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_mongodb():
    """Initialize MongoDB database with collections and indexes"""
    try:
        with MongoDBConnection() as conn:
            db = conn.get_database()
            
            # Create collections and indexes
            for collection_name, config in COLLECTION_CONFIGS.items():
                logger.info(f"Initializing collection: {collection_name}")
                
                # Get or create collection
                collection = db[collection_name]
                
                # Create indexes
                if config.get("indexes"):
                    logger.info(f"Creating indexes for {collection_name}")
                    collection.create_indexes(config["indexes"])
                
                logger.info(f"Collection {collection_name} initialized successfully")
            
            # Verify all collections exist
            existing_collections = db.list_collection_names()
            logger.info(f"Existing collections: {existing_collections}")
            
            return True
            
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB: {e}")
        return False

def check_database_status():
    """Check database status and collection counts"""
    try:
        with MongoDBConnection() as conn:
            db = conn.get_database()
            
            status = {
                "database_name": db.name,
                "collections": {},
                "total_documents": 0
            }
            
            # Get collection stats
            for collection_name in COLLECTION_CONFIGS.keys():
                collection = db[collection_name]
                count = collection.count_documents({})
                status["collections"][collection_name] = {
                    "document_count": count,
                    "indexes": list(collection.index_information().keys())
                }
                status["total_documents"] += count
            
            return status
            
    except Exception as e:
        logger.error(f"Failed to check database status: {e}")
        return {"error": str(e)}

def migrate_from_sqlite():
    """Optional: Migrate data from SQLite to MongoDB"""
    # This would require reading from the SQLite database and inserting into MongoDB
    # For now, we'll just create the structure
    logger.info("Migration from SQLite would be implemented here")
    return True

if __name__ == "__main__":
    print("Initializing MongoDB database...")
    
    # Test connection first
    from mongodb_utils import test_connection
    if test_connection():
        print("✓ MongoDB connection successful")
        
        # Initialize database
        if initialize_mongodb():
            print("✓ MongoDB database initialized successfully")
            
            # Check status
            status = check_database_status()
            print(f"\nDatabase Status:")
            print(f"Database: {status['database_name']}")
            print(f"Total documents: {status['total_documents']}")
            
            for collection_name, info in status["collections"].items():
                print(f"{collection_name}: {info['document_count']} documents, {len(info['indexes'])} indexes")
        else:
            print("✗ Failed to initialize MongoDB")
    else:
        print("✗ MongoDB connection failed")