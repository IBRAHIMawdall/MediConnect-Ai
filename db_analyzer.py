import sqlite3
import json
from typing import Dict, List, Any

def analyze_database():
    """Analyze the medical database structure and content"""
    try:
        conn = sqlite3.connect('medical.db')
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        analysis = {
            "tables": {},
            "row_counts": {},
            "schema_info": {},
            "sample_data": {}
        }
        
        for table in tables:
            # Get schema
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            analysis["schema_info"][table] = columns
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            row_count = cursor.fetchone()[0]
            analysis["row_counts"][table] = row_count
            
            # Get sample data (first 3 rows)
            if row_count > 0:
                cursor.execute(f"SELECT * FROM {table} LIMIT 3")
                sample_rows = cursor.fetchall()
                analysis["sample_data"][table] = sample_rows
        
        conn.close()
        return analysis
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    result = analyze_database()
    print(json.dumps(result, indent=2, default=str))