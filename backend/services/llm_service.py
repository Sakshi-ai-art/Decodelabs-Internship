import os
from typing import List
from pydantic import BaseModel, Field
from openai import OpenAI

class CopyVariation(BaseModel):
    headline: str = Field(description="A catchy, high-converting headline (or Email Subject Line for emails)")
    content: str = Field(description="The primary marketing copy, caption, or email body. Adhere strictly to the character, word count, and style requirements of the platform.")
    cta: str = Field(description="A compelling Call to Action (or CTA button text for emails)")
    hashtags: List[str] = Field(description="A list of relevant hashtags (optional/empty if not appropriate, e.g. for Emails, but populated for social media platforms)")

class CopyGenerationResponse(BaseModel):
    variations: List[CopyVariation] = Field(description="Exactly three distinct and unique marketing copy variations.")

class LLMService:
    def __init__(self):
        # Read API key. Don't throw exception on startup if key is not yet set,
        # but check for validity when a request is actually executed.
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = None
        if api_key and api_key != "your-openai-api-key-here":
            self.client = OpenAI(api_key=api_key)
        self.default_model = os.getenv("OPENAI_MODEL", "gpt-4o")

    def generate_variations(
        self,
        prompt: str,
        temperature: float = 0.7,
        top_p: float = 0.9,
        max_tokens: int = 1000
    ) -> CopyGenerationResponse:
        # Re-check API key in case it was updated in the .env file after startup
        if not self.client:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key and api_key != "your-openai-api-key-here":
                self.client = OpenAI(api_key=api_key)
            else:
                raise ValueError("OpenAI API Key is not set or is still the default placeholder. Please configure your OPENAI_API_KEY in backend/.env")

        try:
            completion = self.client.beta.chat.completions.parse(
                model=self.default_model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an elite marketing copywriter who specializes in high-converting copy optimized for social media platforms and email. You always output the result in the requested JSON structure containing exactly 3 distinct, creative variations."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                response_format=CopyGenerationResponse,
                temperature=temperature,
                top_p=top_p,
                max_tokens=max_tokens
            )
            
            parsed_response = completion.choices[0].message.parsed
            if not parsed_response or len(parsed_response.variations) < 3:
                # Fallback check
                raise ValueError("LLM returned incomplete variations structure.")
                
            return parsed_response
            
        except Exception as e:
            # Propagate error with clear context
            raise RuntimeError(f"Failed to generate copywriting: {str(e)}")
