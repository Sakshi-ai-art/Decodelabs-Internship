import os
import sys
from dotenv import load_dotenv

# Ensure workspace root is in PYTHONPATH so python can resolve 'backend' packages
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env variables before importing database or routing modules
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=dotenv_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.db import engine, Base
from backend.routes import copy, history, analytics
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Automatically create tables in PostgreSQL on startup
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables verified/created successfully.")
except Exception as e:
    print(f"Note: Could not automatically create database tables ({e}). Database connection might not be configured yet.")

app = FastAPI(
    title="Automated Copywriting & Tone Transformer API",
    description="Backend API for AI-powered marketing copy generation, history persistence, and analytics.",
    version="1.0.0"
)

# Rate Limiter setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration to allow local frontend access
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(copy.router, prefix="/api", tags=["Generation"])
app.include_router(history.router, prefix="/api", tags=["History"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Automated Copywriting & Tone Transformer API",
        "docs_url": "/docs"
    }
