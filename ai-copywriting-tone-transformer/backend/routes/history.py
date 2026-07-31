from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from backend.database.db import get_db
from backend.models.models import SavedCopy

router = APIRouter()

class SaveRequest(BaseModel):
    product_name: str = Field(..., description="Name of the product")
    platform: str = Field(..., description="Target platform")
    tone: str = Field(..., description="Tone used")
    prompt: str = Field(..., description="The template prompt compiled for this generation")
    headline: Optional[str] = Field(None, description="Generated headline")
    content: str = Field(..., description="Generated content body")
    cta: Optional[str] = Field(None, description="Generated Call To Action")
    hashtags: List[str] = Field(default=[], description="Generated list of hashtags")
    temperature: float = Field(..., description="Temperature inference parameter used")
    top_p: float = Field(..., description="Top-P inference parameter used")

@router.post("/save-content")
async def save_content(request: SaveRequest, db: Session = Depends(get_db)):
    try:
        db_copy = SavedCopy(
            product_name=request.product_name,
            platform=request.platform,
            tone=request.tone,
            prompt=request.prompt,
            headline=request.headline,
            content=request.content,
            cta=request.cta,
            hashtags=request.hashtags,
            temperature=request.temperature,
            top_p=request.top_p
        )
        db.add(db_copy)
        db.commit()
        db.refresh(db_copy)
        return {"status": "success", "id": db_copy.id, "message": "Content saved successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save copy: {str(e)}")

@router.get("/history")
async def get_history(
    search: Optional[str] = Query(None, description="Search product name"),
    platform: Optional[str] = Query(None, description="Filter by platform"),
    tone: Optional[str] = Query(None, description="Filter by tone"),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(SavedCopy)
        
        if search:
            query = query.filter(SavedCopy.product_name.ilike(f"%{search}%"))
        if platform:
            query = query.filter(SavedCopy.platform == platform)
        if tone:
            query = query.filter(SavedCopy.tone == tone)
            
        # Order by latest first
        history_list = query.order_by(SavedCopy.timestamp.desc()).all()
        
        return history_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@router.delete("/history/{id}")
async def delete_history_item(id: int, db: Session = Depends(get_db)):
    try:
        item = db.query(SavedCopy).filter(SavedCopy.id == id).first()
        if not item:
            raise HTTPException(status_code=404, detail="History record not found")
        db.delete(item)
        db.commit()
        return {"status": "success", "message": "Record deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete history record: {str(e)}")
