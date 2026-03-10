#!/usr/bin/env python3
"""
ETL Script for MongoDB to PostgreSQL
Extracts data from MongoDB using aggregation pipelines,
transforms it to CSV format, and loads it into PostgreSQL
"""

import json
import csv
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
import logging

# Third-party imports
try:
    from pymongo import MongoClient
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError as e:
    print(f"Error: Missing required package. Please run: pip install -r requirements.txt")
    print(f"Details: {e}")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class ETLProcessor:
    """Handles ETL operations from MongoDB to PostgreSQL"""
    
    def __init__(self, config_path: str = 'config.json'):
        """Initialize ETL processor with configuration"""
        self.config = self._load_config(config_path)
        self.mongo_client = None
        self.pg_conn = None
        self.output_dir = 'output'
        os.makedirs(self.output_dir, exist_ok=True)
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            logger.info(f"Configuration loaded from {config_path}")
            return config
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {config_path}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in configuration file: {e}")
            sys.exit(1)
    
    def connect_mongodb(self):
        """Establish connection to MongoDB"""
        try:
            mongo_config = self.config['mongodb']
            self.mongo_client = MongoClient(mongo_config['uri'])
            self.mongo_db = self.mongo_client[mongo_config['database']]
            # Test connection
            self.mongo_client.server_info()
            logger.info(f"Connected to MongoDB: {mongo_config['database']}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    def connect_postgresql(self):
        """Establish connection to PostgreSQL"""
        try:
            pg_config = self.config['postgresql']
            self.pg_conn = psycopg2.connect(
                host=pg_config['host'],
                port=pg_config['port'],
                database=pg_config['database'],
                user=pg_config['user'],
                password=pg_config['password'],
                client_encoding='UTF8'
            )
            self.pg_conn.set_client_encoding('UTF8')
            logger.info(f"Connected to PostgreSQL: {pg_config['database']}")
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise
    
    def extract_data(self, collection_name: str, pipeline: List[Dict]) -> List[Dict]:
        """Extract data from MongoDB using aggregation pipeline"""
        try:
            collection = self.mongo_db[collection_name]
            logger.info(f"Executing aggregation on collection: {collection_name}")
            
            results = list(collection.aggregate(pipeline))
            logger.info(f"Extracted {len(results)} documents from {collection_name}")
            return results
        except Exception as e:
            logger.error(f"Error extracting data from {collection_name}: {e}")
            raise
    
    def save_to_csv(self, data: List[Dict], filename: str) -> str:
        """Save data to CSV file"""
        if not data:
            logger.warning(f"No data to save for {filename}")
            return None
        
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            # Get all unique keys from data
            fieldnames = set()
            for record in data:
                fieldnames.update(record.keys())
            
            # Remove _id if present (already converted to string IDs)
            fieldnames.discard('_id')
            fieldnames = sorted(fieldnames)
            
            with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for record in data:
                    # Remove _id and handle None values
                    clean_record = {k: v for k, v in record.items() if k != '_id'}
                    
                    # Convert datetime objects to ISO format
                    for key, value in clean_record.items():
                        if isinstance(value, datetime):
                            clean_record[key] = value.isoformat()
                        elif value is None:
                            clean_record[key] = ''
                    
                    writer.writerow(clean_record)
            
            logger.info(f"Data saved to CSV: {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"Error saving to CSV {filename}: {e}")
            raise
    
    def create_table(self, create_sql: str):
        """Create table in PostgreSQL if it doesn't exist"""
        try:
            cursor = self.pg_conn.cursor()
            cursor.execute(create_sql)
            self.pg_conn.commit()
            cursor.close()
            logger.info("Table created/verified successfully")
        except Exception as e:
            logger.error(f"Error creating table: {e}")
            self.pg_conn.rollback()
            raise
    
    def load_to_postgresql(self, data: List[Dict], table_name: str, truncate: bool = True):
        """Load data into PostgreSQL table"""
        if not data:
            logger.warning(f"No data to load into {table_name}")
            return
        
        try:
            cursor = self.pg_conn.cursor()
            
            # Optionally truncate table before loading
            if truncate:
                cursor.execute(f"TRUNCATE TABLE {table_name} CASCADE")
                logger.info(f"Truncated table: {table_name}")
            
            # Get column names (excluding _id)
            columns = [k for k in data[0].keys() if k != '_id']
            
            # Prepare data for insertion
            values = []
            for record in data:
                row = []
                for col in columns:
                    value = record.get(col)
                    # Convert datetime to string for PostgreSQL
                    if isinstance(value, datetime):
                        value = value.isoformat()
                    # Ensure strings are properly encoded
                    elif isinstance(value, str):
                        value = value.encode('utf-8', errors='ignore').decode('utf-8')
                    row.append(value)
                values.append(tuple(row))
            
            # Build INSERT query
            columns_str = ', '.join(columns)
            query = f"INSERT INTO {table_name} ({columns_str}) VALUES %s ON CONFLICT DO NOTHING"
            
            # Execute batch insert
            execute_values(cursor, query, values)
            self.pg_conn.commit()
            
            rows_inserted = cursor.rowcount
            cursor.close()
            
            logger.info(f"Loaded {rows_inserted} rows into {table_name}")
        except Exception as e:
            logger.error(f"Error loading data to {table_name}: {e}")
            self.pg_conn.rollback()
            raise
    
    def run_etl_job(self, job: Dict):
        """Execute a single ETL job"""
        job_name = job['name']
        logger.info(f"Starting ETL job: {job_name}")
        
        try:
            # Extract
            data = self.extract_data(
                job['source_collection'],
                job['aggregate_pipeline']
            )
            
            # Transform & Save to CSV
            csv_filename = f"{job_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            csv_path = self.save_to_csv(data, csv_filename)
            
            # Load
            if csv_path and data:
                self.create_table(job['create_table_sql'])
                self.load_to_postgresql(data, job['target_table'])
            
            logger.info(f"Completed ETL job: {job_name}")
            return True
        except Exception as e:
            logger.error(f"Failed ETL job {job_name}: {e}")
            return False
    
    def run_all_jobs(self):
        """Execute all enabled ETL jobs"""
        logger.info("=" * 60)
        logger.info("Starting ETL Process")
        logger.info("=" * 60)
        
        # Connect to databases
        self.connect_mongodb()
        self.connect_postgresql()
        
        # Get enabled jobs
        jobs = [job for job in self.config['etl_jobs'] if job.get('enabled', True)]
        logger.info(f"Found {len(jobs)} enabled ETL jobs")
        
        # Execute each job
        results = []
        for job in jobs:
            success = self.run_etl_job(job)
            results.append({
                'job': job['name'],
                'success': success
            })
        
        # Summary
        logger.info("=" * 60)
        logger.info("ETL Process Summary")
        logger.info("=" * 60)
        for result in results:
            status = "✓ SUCCESS" if result['success'] else "✗ FAILED"
            logger.info(f"{status}: {result['job']}")
        
        successful = sum(1 for r in results if r['success'])
        logger.info(f"\nCompleted: {successful}/{len(results)} jobs successful")
    
    def close_connections(self):
        """Close all database connections"""
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("MongoDB connection closed")
        if self.pg_conn:
            self.pg_conn.close()
            logger.info("PostgreSQL connection closed")


def main():
    """Main entry point"""
    etl = ETLProcessor()
    
    try:
        etl.run_all_jobs()
    except KeyboardInterrupt:
        logger.warning("\nETL process interrupted by user")
    except Exception as e:
        logger.error(f"ETL process failed: {e}")
        sys.exit(1)
    finally:
        etl.close_connections()


if __name__ == '__main__':
    main()
