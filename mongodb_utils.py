"""
MongoDB connection utility for medical database
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class MongoDBConnection:
    """MongoDB connection manager with proper authentication"""
    
    def __init__(self, connection_string: Optional[str] = None):
        self.connection_string = connection_string or os.getenv(
            "MONGODB_URI", 
            "mongodb+srv://ibrahim:1234@cluster0.dmj7afa.mongodb.net/"
        )
        self.client: Optional[MongoClient] = None
        self.database_name = "medical_database"
    
    def connect(self) -> bool:
        """Establish connection to MongoDB"""
        try:
            self.client = MongoClient(
                self.connection_string,
                serverSelectionTimeoutMS=5000,
                socketTimeoutMS=3000,
                connectTimeoutMS=3000,
                retryWrites=True,
                w="majority"
            )
            
            # Test connection
            self.client.admin.command('ping')
            logger.info(f"Successfully connected to MongoDB: {self.connection_string}")
            return True
            
        except ConnectionFailure as e:
            logger.error(f"MongoDB connection failed: {e}")
            return False
        except ConfigurationError as e:
            logger.error(f"MongoDB configuration error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            return False
    
    def get_database(self):
        """Get the medical database instance"""
        if not self.client:
            if not self.connect():
                raise ConnectionError("Failed to connect to MongoDB")
        return self.client[self.database_name]
    
    def get_collection(self, collection_name: str):
        """Get a specific collection from the database"""
        db = self.get_database()
        return db[collection_name]
    
    def close(self):
        """Close the MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

# Global connection instance
mongodb_connection = MongoDBConnection()

def get_mongodb_collection(collection_name: str):
    """Helper function to get MongoDB collection"""
    return mongodb_connection.get_collection(collection_name)

def test_connection() -> bool:
    """Test MongoDB connection"""
    try:
        with MongoDBConnection() as conn:
            db = conn.get_database()
            # Try to list collections to verify connection
            db.list_collection_names()
            return True
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return False

if __name__ == "__main__":
    # Test the connection
    success = test_connection()
    print(f"Connection test: {'SUCCESS' if success else 'FAILED'}")