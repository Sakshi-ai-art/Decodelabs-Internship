from sqlalchemy import Column, Integer, String, Text, Float, DateTime, JSON
from sqlalchemy.sql import func
from backend.database.db import Base

class SavedCopy(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(255), nullable=False)
    platform = Column(String(50), nullable=False)
    tone = Column(String(50), nullable=False)
    prompt = Column(Text, nullable=False)
    headline = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    cta = Column(String(500), nullable=True)
    hashtags = Column(JSON, nullable=True)
    temperature = Column(Float, nullable=False)
    top_p = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
