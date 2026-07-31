from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from backend.services.prompt_builder import PromptBuilder
from backend.services.llm_service import LLMService, CopyGenerationResponse

router = APIRouter()
llm_service = LLMService()

class GenerateRequest(BaseModel):
    product_name: str = Field(..., min_length=1, description="Name of the product")
    product_description: str = Field(..., min_length=1, description="Description of the product")
    platform: str = Field(..., description="Target platform (e.g. LinkedIn, Instagram, Email, Twitter/X, Facebook)")
    tone: str = Field(..., description="Tone of the copy (e.g. Professional, Casual, Friendly, Luxury, Persuasive, Humorous)")
    temperature: float = Field(default=0.7, ge=0.0, le=1.5, description="Sampling temperature")
    top_p: float = Field(default=0.9, ge=0.0, le=1.0, description="Top-p sampling")
    max_tokens: int = Field(default=1000, ge=50, le=2000, description="Maximum tokens to generate")

class GenerateResponse(BaseModel):
    prompt: str
    variations: list

@router.post("/generate-copy", response_model=GenerateResponse)
async def generate_copy(request: GenerateRequest):
    try:
        # Compile prompt using variables
        compiled_prompt = PromptBuilder.build_prompt(
            product_name=request.product_name,
            product_description=request.product_description,
            platform=request.platform,
            tone=request.tone
        )
        
        # Call LLM service to generate variations
        llm_response = llm_service.generate_variations(
            prompt=compiled_prompt,
            temperature=request.temperature,
            top_p=request.top_p,
            max_tokens=request.max_tokens
        )
        
        return GenerateResponse(
            prompt=compiled_prompt,
            variations=[v.model_dump() for v in llm_response.variations]
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
