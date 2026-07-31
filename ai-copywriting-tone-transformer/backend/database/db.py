import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from urllib.parse import urlparse
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/copywriting_tone_transformer")

def create_db_if_not_exists():
    try:
        url = urlparse(DATABASE_URL)
        dbname = url.path.lstrip('/')
        # Connect to template database (postgres) to check/create the target database
        conn = psycopg2.connect(
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port or 5432,
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (dbname,))
        exists = cur.fetchone()
        
        if not exists:
            # We cannot parameterize the DB name in CREATE DATABASE, so we interpolate it carefully
            # since dbname is extracted from DATABASE_URL.
            # Clean dbname to prevent SQL injection
            clean_dbname = "".join(c for c in dbname if c.isalnum() or c == '_')
            cur.execute(f"CREATE DATABASE {clean_dbname}")
            print(f"Database {clean_dbname} created successfully!")
        else:
            print(f"Database {dbname} already exists.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Note: Could not check/create database automatically ({e}). Assumed database exists or will be created manually.")

# Try to create database first
create_db_if_not_exists()

# Now setup SQLAlchemy engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
