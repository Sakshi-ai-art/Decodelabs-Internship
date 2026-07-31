from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session
from backend.database.db import get_db
from backend.models.models import SavedCopy

router = APIRouter()

@router.get("/analytics")
async def get_analytics(db: Session = Depends(get_db)):
    try:
        # 1. Total Generations
        total_generations = db.query(func.count(SavedCopy.id)).scalar() or 0
        
        # 2. Most Used Platform
        platform_res = db.query(
            SavedCopy.platform, 
            func.count(SavedCopy.platform).label('cnt')
        ).group_by(SavedCopy.platform).order_by(func.count(SavedCopy.platform).desc()).first()
        most_used_platform = platform_res[0] if platform_res else "None"
        
        # 3. Most Used Tone
        tone_res = db.query(
            SavedCopy.tone, 
            func.count(SavedCopy.tone).label('cnt')
        ).group_by(SavedCopy.tone).order_by(func.count(SavedCopy.tone).desc()).first()
        most_used_tone = tone_res[0] if tone_res else "None"
        
        # 4. Average Temperature Used
        avg_temp_res = db.query(func.avg(SavedCopy.temperature)).scalar()
        avg_temp = round(float(avg_temp_res), 2) if avg_temp_res is not None else 0.0
        
        # 5. Platforms Usage Breakdown (Pie/Bar Chart)
        platform_breakdown = db.query(
            SavedCopy.platform, 
            func.count(SavedCopy.platform).label('count')
        ).group_by(SavedCopy.platform).all()
        platform_data = [{"platform": r[0], "count": r[1]} for r in platform_breakdown]
        
        # 6. Tones Usage Breakdown (Bar/Radar Chart)
        tone_breakdown = db.query(
            SavedCopy.tone, 
            func.count(SavedCopy.tone).label('count')
        ).group_by(SavedCopy.tone).all()
        tone_data = [{"tone": r[0], "count": r[1]} for r in tone_breakdown]
        
        # 7. Generations Over Time (Area Chart)
        # PostgreSQL supports casting timestamp directly to Date
        date_breakdown = db.query(
            cast(SavedCopy.timestamp, Date).label('date'), 
            func.count(SavedCopy.id).label('count')
        ).group_by(cast(SavedCopy.timestamp, Date)).order_by(cast(SavedCopy.timestamp, Date)).all()
        date_data = [{"date": str(r[0]), "count": r[1]} for r in date_breakdown]
        
        # 8. Avg Temperature per Platform (Line Chart)
        temp_platform_breakdown = db.query(
            SavedCopy.platform,
            func.avg(SavedCopy.temperature).label('avg_temp')
        ).group_by(SavedCopy.platform).all()
        temp_platform_data = [{"platform": r[0], "avg_temp": round(float(r[1]), 2)} for r in temp_platform_breakdown]

        return {
            "summary": {
                "total_generations": total_generations,
                "most_used_platform": most_used_platform,
                "most_used_tone": most_used_tone,
                "avg_temperature": avg_temp
            },
            "charts": {
                "platform_distribution": platform_data,
                "tone_distribution": tone_data,
                "generations_timeline": date_data,
                "temperature_by_platform": temp_platform_data
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate analytics: {str(e)}")
