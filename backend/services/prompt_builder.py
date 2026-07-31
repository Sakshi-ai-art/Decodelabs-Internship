class PromptBuilder:
    BASE_TEMPLATE = """You are an expert marketing copywriter.

Product Name: {product_name}
Description: {product_description}
Platform: {platform}
Tone: {tone}

Generate high-converting marketing content specifically optimized for the selected platform.
Include relevant hashtags where appropriate.
Keep formatting suitable for the platform."""

    PLATFORM_RULES = {
        "LinkedIn": (
            "- Tone & Style: Professional, business-focused, authoritative, yet engaging.\n"
            "- Length: 150-300 words.\n"
            "- Format: Structured paragraphs with clear key points, industry insights, and professional hooks."
        ),
        "Instagram": (
            "- Tone & Style: Engaging, visually appealing, friendly, and relatable.\n"
            "- Emojis: Generous use of relevant emojis to break up text and draw attention.\n"
            "- Length: Light-to-medium caption.\n"
            "- Hashtags: Integrate a list of 5-15 highly relevant hashtags at the bottom."
        ),
        "Email": (
            "- Format: Structure your copy explicitly as an Email with a Subject Line, Body, and a Call to Action (CTA) Button Text.\n"
            "- Tone & Style: Informative, direct, and persuasive, written to encourage click-through rates."
        ),
        "Twitter/X": (
            "- Length: STRICTLY under 280 characters in total.\n"
            "- Style: High-impact, concise, catchy hook, and immediate value proposition. Use 1-2 hashtags maximum."
        ),
        "Facebook": (
            "- Tone & Style: Storytelling, conversational, relatable, and narrative-focused.\n"
            "- Length: Medium length (around 100-200 words) that builds community engagement and invites comments."
        )
    }
    
    TONE_INSTRUCTIONS = {
        "Professional": "Write in an authoritative, expert, clear, and business-focused tone, using industry-appropriate terminology without jargon.",
        "Casual": "Write in an informal, relaxed, everyday conversational style. Use friendly contractions and keep it down-to-earth.",
        "Friendly": "Write in a warm, welcoming, positive, and supportive manner that establishes trust and connection with the reader.",
        "Luxury": "Write in an elegant, sophisticated, exclusive, and premium tone. Emphasize high quality, craftsmanship, prestige, and unique value.",
        "Persuasive": "Write in a highly compelling, benefits-driven, call-to-action focused tone. Use psychological triggers, highlight solutions to problems, and emphasize urgency.",
        "Humorous": "Write in a witty, lighthearted, clever, and entertaining manner. Use wordplay, gentle sarcasm, or situational humor where appropriate to make the copy memorable."
    }

    @classmethod
    def build_prompt(cls, product_name: str, product_description: str, platform: str, tone: str) -> str:
        prompt = cls.BASE_TEMPLATE.format(
            product_name=product_name,
            product_description=product_description,
            platform=platform,
            tone=tone
        )
        
        # Append platform rules
        platform_rule = cls.PLATFORM_RULES.get(platform, "")
        if platform_rule:
            prompt += f"\n\nPlatform-Specific Guidelines for {platform}:\n{platform_rule}"
            
        # Append tone instructions
        tone_instruction = cls.TONE_INSTRUCTIONS.get(tone, "")
        if tone_instruction:
            prompt += f"\n\nTone Guidance for '{tone}':\n{tone_instruction}"
            
        return prompt
