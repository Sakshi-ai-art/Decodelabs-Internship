import streamlit as st
import os
import pandas as pd
import altair as alt
from io import BytesIO
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, JSON, func, cast, Date
from sqlalchemy.orm import sessionmaker, declarative_base
from pydantic import BaseModel, Field
from typing import List, Optional
from openai import OpenAI
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Load local environment variables (if any)
load_dotenv()

# ==========================================
# 1. DATABASE CONFIGURATION & FALLBACK
# ==========================================
Base = declarative_base()

class SavedCopy(Base):
    __tablename__ = "streamlit_history"

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

def get_db_session():
    # Attempt to read DB URL from Streamlit Secrets, then environment, then fallback to SQLite
    db_url = None
    
    # 1. Check Streamlit Secrets
    try:
        if "DATABASE_URL" in st.secrets:
            db_url = st.secrets["DATABASE_URL"]
    except:
        pass
        
    # 2. Check Environment Variables
    if not db_url:
        db_url = os.getenv("DATABASE_URL")
        
    # 3. Fallback to Local SQLite
    if not db_url:
        db_url = "sqlite:///streamlit_history.db"
        
    try:
        # SQLite connection needs special argument for multithreading
        connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
        engine = create_engine(db_url, connect_args=connect_args)
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal(), db_url
    except Exception as e:
        # Severe fallback to in-memory SQLite if write permissions are blocked
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal(), "sqlite:///:memory: (in-memory fallback due to: " + str(e) + ")"

# ==========================================
# 2. PROMPT BUILDER ENGINE
# ==========================================
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
        
        platform_rule = cls.PLATFORM_RULES.get(platform, "")
        if platform_rule:
            prompt += f"\n\nPlatform-Specific Guidelines for {platform}:\n{platform_rule}"
            
        tone_instruction = cls.TONE_INSTRUCTIONS.get(tone, "")
        if tone_instruction:
            prompt += f"\n\nTone Guidance for '{tone}':\n{tone_instruction}"
            
        return prompt

# ==========================================
# 3. LLM GENERATION & STRUCTURED OUTPUT
# ==========================================
class CopyVariation(BaseModel):
    headline: str = Field(description="A catchy, high-converting headline (or Email Subject Line for emails)")
    content: str = Field(description="The primary marketing copy, caption, or email body. Adhere strictly to the character, word count, and style requirements of the platform.")
    cta: str = Field(description="A compelling Call to Action (or CTA button text for emails)")
    hashtags: List[str] = Field(description="A list of relevant hashtags (optional/empty if not appropriate)")

class CopyGenerationResponse(BaseModel):
    variations: List[CopyVariation] = Field(description="Exactly three distinct and unique marketing copy variations.")

def get_openai_api_key():
    # 1. Streamlit Secrets
    try:
        if "OPENAI_API_KEY" in st.secrets:
            return st.secrets["OPENAI_API_KEY"]
    except:
        pass
    # 2. Environment Variable
    return os.getenv("OPENAI_API_KEY", "")

# ==========================================
# 4. PDF EXPORT COMPONENT
# ==========================================
def generate_pdf_buffer(product_name, platform, tone, variation, temp, top_p):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#4f46e5'),
        spaceAfter=15
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b'),
        spaceBefore=12,
        spaceAfter=3
    )
    
    text_style = ParagraphStyle(
        'ContentText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=10
    )
    
    bold_text_style = ParagraphStyle(
        'BoldContentText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=10
    )
    
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#94a3b8'),
        spaceAfter=15
    )

    story = []
    
    story.append(Paragraph(f"ToneTransformer Copywriting - {platform}", title_style))
    
    meta_text = f"<b>Product Name:</b> {product_name} | <b>Tone:</b> {tone}<br/>" \
                f"<b>Parameters:</b> Temp {temp}, Top-P {top_p} | <b>Date:</b> {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}"
    story.append(Paragraph(meta_text, meta_style))
    story.append(Spacer(1, 5))
    
    # Headline
    headline_label = "Email Subject Line:" if platform == 'Email' else "Headline / Hook:"
    story.append(Paragraph(headline_label, label_style))
    story.append(Paragraph(variation.headline, bold_text_style))
    
    # Content Body
    body_label = "Email Body Content:" if platform == 'Email' else "Body Copy Caption:"
    story.append(Paragraph(body_label, label_style))
    # Replace line breaks with HTML breaks for reportlab Paragraph compatibility
    body_formatted = variation.content.replace('\n', '<br/>')
    story.append(Paragraph(body_formatted, text_style))
    
    # CTA
    cta_label = "CTA Button Text:" if platform == 'Email' else "Call to Action (CTA):"
    story.append(Paragraph(cta_label, label_style))
    story.append(Paragraph(variation.cta, text_style))
    
    # Hashtags
    if variation.hashtags and len(variation.hashtags) > 0:
        story.append(Paragraph("Recommended Hashtags:", label_style))
        tags_str = " ".join([f"#{t.lstrip('#')}" for t in variation.hashtags])
        story.append(Paragraph(tags_str, text_style))
        
    doc.build(story)
    buffer.seek(0)
    return buffer

# ==========================================
# 5. STREAMLIT FRONTEND APP
# ==========================================
st.set_page_config(
    page_title="ToneTransformer | AI Copywriter",
    page_icon="✨",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom premium styling inject
st.markdown("""
<style>
    /* Dark Mode Aware Container styling */
    .stApp {
        background-color: var(--background-color);
        color: var(--text-color);
    }
    
    /* Premium Title styling */
    .title-gradient {
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
    }
    
    /* Subtle headers styling */
    .section-label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin-bottom: 0.25rem;
    }
    
    /* Code/Prompt blocks */
    .prompt-preview-box {
        font-family: monospace;
        font-size: 0.75rem;
        background-color: rgba(15, 23, 42, 0.05);
        border: 1px solid rgba(15, 23, 42, 0.1);
        padding: 1rem;
        border-radius: 12px;
        color: #475569;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
    }
    .dark .prompt-preview-box {
        background-color: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
    }
</style>
""", unsafe_allow_headers=True)

# Initialize Session States
if "variations" not in st.session_state:
    st.session_state.variations = []
if "generated_prompt" not in st.session_state:
    st.session_state.generated_prompt = ""
if "saved_status" not in st.session_state:
    st.session_state.saved_status = {}

# Sidebar setup
st.sidebar.markdown("<h2 style='color:#6366f1; font-weight:800; display:inline-flex; align-items:center;'>✨ ToneTransformer</h2>", unsafe_allow_html=True)
st.sidebar.caption("SaaS AI Copywriting Workspace")

# Page selector
menu_options = ["🏠 Dashboard", "✍️ Copy Generator", "📁 Saved History", "📊 Analytics"]
page_choice = st.sidebar.radio("Navigation", menu_options)

# Database session & OpenAI key resolution
db_session, db_path = get_db_session()
env_openai_key = get_openai_api_key()

# Sidebar Configurations Accordion
with st.sidebar.expander("🔑 Configurations & Secrets", expanded=False):
    openai_key_input = st.text_input("OpenAI API Key", value=env_openai_key, type="password", help="Needed to run generation requests. Left blank will read from environment or secrets.")
    st.caption(f"**Database Connected:** `{db_path}`")

# Resolve final OpenAI key to use
api_key_to_use = openai_key_input if openai_key_input else env_openai_key

# ==========================================
# PAGE 1: DASHBOARD
# ==========================================
if page_choice == "🏠 Dashboard":
    st.markdown("<h1 class='title-gradient'>Design High-Converting Copy in Seconds</h1>", unsafe_allow_html=True)
    st.write("Generate professional marketing variations optimized for LinkedIn, Instagram, Email, Twitter/X, and Facebook. Customize tone, temperature, and platforms instantly.")
    
    # Call to action banner
    st.info("💡 **Ready to generate?** Click **✍️ Copy Generator** in the sidebar to load variables and create content variations.")
    
    # Feature Stats Row
    col1, col2, col3 = st.columns(3)
    with col1:
        st.subheader("🛠️ Compiles Prompts")
        st.write("Live preview prompt templates dynamically structured with target platform rules and tone guidance before sending to the model.")
    with col2:
        st.subheader("✨ Structured Output")
        st.write("Ensures exact output validation—generating three distinct variations with separate headlines, body copies, CTAs, and hashtags.")
    with col3:
        st.subheader("📊 Analytics Dashboard")
        st.write("Track and monitor metrics, platform distribution shares, copywriting tones, and historical activity.")

    # Platforms list
    st.write("---")
    st.markdown("### 🔌 Supported Channels & Guidelines")
    p_col1, p_col2, p_col3, p_col4, p_col5 = st.columns(5)
    with p_col1:
        st.markdown("**LinkedIn**")
        st.caption("Professional business tone, structured hooks, 150-300 words.")
    with p_col2:
        st.markdown("**Instagram**")
        st.caption("Relatable caption, emojis, 5-15 hashtags at the bottom.")
    with p_col3:
        st.markdown("**Email**")
        st.caption("Subject line, structured body copy, call-to-action text.")
    with p_col4:
        st.markdown("**Twitter/X**")
        st.caption("Concise, impactful, strictly under 280 characters.")
    with p_col5:
        st.markdown("**Facebook**")
        st.caption("Storytelling style, medium length, drives engagement.")

# ==========================================
# PAGE 2: COPY GENERATOR
# ==========================================
elif page_choice == "✍️ Copy Generator":
    st.markdown("<h1 class='title-gradient'>Copy Generator Workspace</h1>", unsafe_allow_html=True)
    
    # Check for API Key presence
    if not api_key_to_use:
        st.warning("⚠️ **OpenAI API Key is missing.** Please provide one in the 'Configurations & Secrets' sidebar dropdown before starting.")

    # Dual Column Workspace
    col_input, col_output = st.columns([5, 7])

    with col_input:
        st.markdown("### 🎛️ Parameters")
        
        # Product Name
        prod_name = st.text_input("Product Name", placeholder="e.g. FitPulse Smartwatch", key="gen_prod_name")
        
        # Description
        prod_desc = st.text_area("Product Description", placeholder="e.g. A premium fitness tracker with 24/7 heart rate monitoring, sleep tracking, and a 10-day battery life...", rows=4)
        
        # Platform & Tone in columns
        col_sel1, col_sel2 = st.columns(2)
        with col_sel1:
            plat_sel = st.selectbox("Target Platform", ["LinkedIn", "Instagram", "Email", "Twitter/X", "Facebook"])
        with col_sel2:
            tone_sel = st.selectbox("Tone", ["Professional", "Casual", "Friendly", "Luxury", "Persuasive", "Humorous"])
            
        # Advanced configurations (sliders)
        with st.expander("⚙️ Advanced Model Options"):
            temp_sel = st.slider("Temperature", min_value=0.0, max_value=1.5, value=0.7, step=0.1, help="Higher values are more creative, lower values more deterministic.")
            top_p_sel = st.slider("Top-P", min_value=0.0, max_value=1.0, value=0.9, step=0.05, help="Nucleus sampling limit.")
            tokens_sel = st.number_input("Max Output Tokens", min_value=50, max_value=2000, value=1000, step=50)

        # Dynamic live prompt preview
        with st.expander("👁️ Live Prompt Preview"):
            preview_prompt = PromptBuilder.build_prompt(
                product_name=prod_name if prod_name else "[Product Name]",
                product_description=prod_desc if prod_desc else "[Product Description]",
                platform=plat_sel,
                tone=tone_sel
            )
            st.code(preview_prompt, language="text")

        # Generate trigger button
        generate_btn = st.button("✨ Generate Copy Variations", use_container_width=True, type="primary", disabled=not api_key_to_use)

        if generate_btn:
            if not prod_name or not prod_desc:
                st.error("Please fill out both the Product Name and Product Description fields.")
            else:
                with st.spinner("Compiling prompt and fetching variations from OpenAI..."):
                    try:
                        # Compile full prompt
                        compiled_prompt = PromptBuilder.build_prompt(
                            product_name=prod_name,
                            product_description=prod_desc,
                            platform=plat_sel,
                            tone=tone_sel
                        )
                        
                        # Fetch from OpenAI
                        client = OpenAI(api_key=api_key_to_use)
                        completion = client.beta.chat.completions.parse(
                            model="gpt-4o",
                            messages=[
                                {
                                    "role": "system", 
                                    "content": "You are an elite marketing copywriter who specializes in high-converting copy optimized for social media platforms and email. You always output the result in the requested JSON structure containing exactly 3 distinct, creative variations."
                                },
                                {
                                    "role": "user", 
                                    "content": compiled_prompt
                                }
                            ],
                            response_format=CopyGenerationResponse,
                            temperature=float(temp_sel),
                            top_p=float(top_p_sel),
                            max_tokens=int(tokens_sel)
                        )
                        
                        # Store in session state
                        st.session_state.variations = completion.choices[0].message.parsed.variations
                        st.session_state.generated_prompt = compiled_prompt
                        st.session_state.saved_status = {}  # Reset save button click states
                        st.success("Successfully generated 3 copywriting variations!")
                    except Exception as e:
                        st.error(f"Failed to generate copy variations: {e}")

    with col_output:
        st.markdown("### 📝 Variations Workspace")
        
        if len(st.session_state.variations) == 0:
            st.info("Generate variations on the left panel to populate this workspace.")
        else:
            # Build tabs for the 3 variations
            tab1, tab2, tab3 = st.tabs(["Variation 1", "Variation 2", "Variation 3"])
            
            for idx, tab in enumerate([tab1, tab2, tab3]):
                with tab:
                    var = st.session_state.variations[idx]
                    
                    # Headline
                    st.markdown(f"<div class='section-label'>{'Subject Line' if plat_sel == 'Email' else 'Headline'}</div>", unsafe_allow_html=True)
                    st.subheader(var.headline)
                    
                    # Body copy
                    st.markdown(f"<div class='section-label'>{'Email Body' if plat_sel == 'Email' else 'Copy Content'}</div>", unsafe_allow_html=True)
                    st.write(var.content)
                    
                    # CTA
                    st.markdown(f"<div class='section-label'>{'CTA Button' if plat_sel == 'Email' else 'Call to Action'}</div>", unsafe_allow_html=True)
                    st.markdown(f"👉 **{var.cta}**")
                    
                    # Hashtags
                    if var.hashtags and len(var.hashtags) > 0:
                        st.markdown("<div class='section-label'>Hashtags</div>", unsafe_allow_html=True)
                        tags_formatted = " ".join([f"#{t.lstrip('#')}" for t in var.hashtags])
                        st.write(tags_formatted)
                        
                    st.write("---")
                    
                    # Toolbar row
                    tool_col1, tool_col2, tool_col3, tool_col4 = st.columns(4)
                    
                    # 1. Download TXT
                    txt_data = f"Product: {prod_name}\nPlatform: {plat_sel}\nTone: {tone_sel}\n\n" \
                               f"{'SUBJECT' if plat_sel == 'Email' else 'HEADLINE'}:\n{var.headline}\n\n" \
                               f"{'BODY' if plat_sel == 'Email' else 'CONTENT'}:\n{var.content}\n\n" \
                               f"CTA:\n{var.cta}"
                    if var.hashtags and len(var.hashtags) > 0:
                        txt_data += f"\n\nHASHTAGS:\n{' '.join(var.hashtags)}"
                        
                    with tool_col1:
                        st.download_button(
                            label="📄 Download TXT",
                            data=txt_data,
                            file_name=f"copy-{plat_sel.lower()}-{tone_sel.lower()}-v{idx+1}.txt",
                            mime="text/plain",
                            key=f"dl_txt_{idx}"
                        )
                        
                    # 2. Download PDF
                    with tool_col2:
                        try:
                            pdf_buffer = generate_pdf_buffer(prod_name, plat_sel, tone_sel, var, temp_sel, top_p_sel)
                            st.download_button(
                                label="📥 Download PDF",
                                data=pdf_buffer,
                                file_name=f"copy-{plat_sel.lower()}-{tone_sel.lower()}-v{idx+1}.pdf",
                                mime="application/pdf",
                                key=f"dl_pdf_{idx}"
                            )
                        except Exception as pdf_err:
                            st.caption(f"PDF error: {pdf_err}")
                            
                    # 3. Save to Database
                    with tool_col3:
                        is_saved = st.session_state.saved_status.get(idx, False)
                        if is_saved:
                            st.button("✅ Saved", disabled=True, key=f"saved_btn_{idx}")
                        else:
                            save_click = st.button("💾 Save to History", key=f"save_btn_{idx}")
                            if save_click:
                                try:
                                    db_copy = SavedCopy(
                                        product_name=prod_name,
                                        platform=plat_sel,
                                        tone=tone_sel,
                                        prompt=st.session_state.generated_prompt,
                                        headline=var.headline,
                                        content=var.content,
                                        cta=var.cta,
                                        hashtags=var.hashtags,
                                        temperature=float(temp_sel),
                                        top_p=float(top_p_sel)
                                    )
                                    db_session.add(db_copy)
                                    db_session.commit()
                                    st.session_state.saved_status[idx] = True
                                    st.rerun()
                                except Exception as save_err:
                                    st.error(f"DB Error: {save_err}")
                                    db_session.rollback()

# ==========================================
# PAGE 3: SAVED HISTORY
# ==========================================
elif page_choice == "📁 Saved History":
    st.markdown("<h1 class='title-gradient'>Copywriting History</h1>", unsafe_allow_html=True)
    st.write("Browse, inspect, and manage copy variations you have committed to database history.")

    # Search & filters in row
    filt_col1, filt_col2, filt_col3 = st.columns([6, 3, 3])
    with filt_col1:
        hist_search = st.text_input("Search Product Name", placeholder="Type product keyword...")
    with filt_col2:
        hist_platform = st.selectbox("Platform filter", ["All Platforms", "LinkedIn", "Instagram", "Email", "Twitter/X", "Facebook"])
    with filt_col3:
        hist_tone = st.selectbox("Tone filter", ["All Tones", "Professional", "Casual", "Friendly", "Luxury", "Persuasive", "Humorous"])

    # Query DB
    try:
        query = db_session.query(SavedCopy)
        if hist_search:
            query = query.filter(SavedCopy.product_name.ilike(f"%{hist_search}%"))
        if hist_platform != "All Platforms":
            query = query.filter(SavedCopy.platform == hist_platform)
        if hist_tone != "All Tones":
            query = query.filter(SavedCopy.tone == hist_tone)
            
        history_list = query.order_by(SavedCopy.timestamp.desc()).all()
        
        if len(history_list) == 0:
            st.info("No saved copywriting logs found.")
        else:
            for item in history_list:
                # Format card using Streamlit Expander
                date_str = item.timestamp.strftime('%Y-%m-%d %H:%M') if item.timestamp else "Unknown"
                header_title = f"🏷️ {item.product_name} | {item.platform} ({item.tone}) - {date_str}"
                
                with st.expander(header_title):
                    st.markdown(f"**{'Subject Line' if item.platform == 'Email' else 'Headline / Hook'}:**")
                    st.write(item.headline)
                    st.write("")
                    
                    st.markdown(f"**{'Email Body' if item.platform == 'Email' else 'Body Content'}:**")
                    st.write(item.content)
                    st.write("")
                    
                    st.markdown(f"**Call to Action:** `{item.cta}`")
                    
                    if item.hashtags and len(item.hashtags) > 0:
                        st.write("")
                        st.markdown("**Hashtags:**")
                        st.write(" ".join([f"#{t.lstrip('#')}" for t in item.hashtags]))
                        
                    st.write("---")
                    
                    # Actions inside expander
                    act_col1, act_col2, act_col3, act_col4 = st.columns([3, 3, 3, 3])
                    
                    # Reconstruct variation object for export helpers
                    var_obj = CopyVariation(
                        headline=item.headline if item.headline else "",
                        content=item.content,
                        cta=item.cta if item.cta else "",
                        hashtags=item.hashtags if item.hashtags else []
                    )
                    
                    with act_col1:
                        txt_data = f"Product: {item.product_name}\nPlatform: {item.platform}\nTone: {item.tone}\n\n" \
                                   f"HEADLINE: {item.headline}\n\nBODY:\n{item.content}\n\nCTA: {item.cta}"
                        if item.hashtags:
                            txt_data += f"\n\nHASHTAGS: {' '.join(item.hashtags)}"
                        st.download_button(
                            label="📄 Download TXT",
                            data=txt_data,
                            file_name=f"saved-copy-{item.id}.txt",
                            mime="text/plain",
                            key=f"dl_txt_hist_{item.id}"
                        )
                        
                    with act_col2:
                        try:
                            pdf_buf = generate_pdf_buffer(item.product_name, item.platform, item.tone, var_obj, item.temperature, item.top_p)
                            st.download_button(
                                label="📥 Download PDF",
                                data=pdf_buf,
                                file_name=f"saved-copy-{item.id}.pdf",
                                mime="application/pdf",
                                key=f"dl_pdf_hist_{item.id}"
                            )
                        except Exception as pdf_hist_err:
                            st.caption(f"PDF Error: {pdf_hist_err}")
                            
                    with act_col4:
                        delete_confirm = st.button("🗑️ Delete Log", key=f"del_hist_{item.id}")
                        if delete_confirm:
                            try:
                                db_session.delete(item)
                                db_session.commit()
                                st.success("Deleted successfully.")
                                st.rerun()
                            except Exception as del_err:
                                st.error(f"Delete Error: {del_err}")
                                db_session.rollback()
                                
    except Exception as query_err:
        st.error(f"Database query error: {query_err}")

# ==========================================
# PAGE 4: ANALYTICS
# ==========================================
elif page_choice == "📊 Analytics":
    st.markdown("<h1 class='title-gradient'>Copy Performance Analytics</h1>", unsafe_allow_html=True)
    st.write("Aggregated historical parameters, platform shares, and tone frequencies.")

    try:
        # Collect counts
        total_gens = db_session.query(func.count(SavedCopy.id)).scalar() or 0
        
        if total_gens == 0:
            st.info("No copy has been saved yet. Generate and save copy to display analytics charts.")
        else:
            # 1. KPIs Row
            kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
            
            # Most Used Platform
            plat_res = db_session.query(SavedCopy.platform, func.count(SavedCopy.platform)).group_by(SavedCopy.platform).order_by(func.count(SavedCopy.platform).desc()).first()
            top_platform = plat_res[0] if plat_res else "None"
            
            # Most Used Tone
            tone_res = db_session.query(SavedCopy.tone, func.count(SavedCopy.tone)).group_by(SavedCopy.tone).order_by(func.count(SavedCopy.tone).desc()).first()
            top_tone = tone_res[0] if tone_res else "None"
            
            # Avg Temperature
            avg_temp = db_session.query(func.avg(SavedCopy.temperature)).scalar()
            avg_temp_formatted = round(float(avg_temp), 2) if avg_temp is not None else 0.0
            
            with kpi_col1:
                st.metric("Total Saved Copies", total_gens)
            with kpi_col2:
                st.metric("Most Popular Platform", top_platform)
            with kpi_col3:
                st.metric("Most Frequent Tone", top_tone)
            with kpi_col4:
                st.metric("Average Temperature", avg_temp_formatted)
                
            st.write("---")
            
            # 2. Charts Row 1
            chart_col1, chart_col2 = st.columns(2)
            
            with chart_col1:
                st.markdown("##### 🔌 Platform Distribution")
                plat_data = db_session.query(SavedCopy.platform, func.count(SavedCopy.platform).label('count')).group_by(SavedCopy.platform).all()
                df_plat = pd.DataFrame(plat_data, columns=['platform', 'count'])
                
                chart_plat = alt.Chart(df_plat).mark_arc(innerRadius=50).encode(
                    theta=alt.Theta(field="count", type="quantitative"),
                    color=alt.Color(field="platform", type="nominal"),
                    tooltip=['platform', 'count']
                ).properties(height=260)
                st.altair_chart(chart_plat, use_container_width=True)
                
            with chart_col2:
                st.markdown("##### 🎭 Tone Breakdown")
                tone_data = db_session.query(SavedCopy.tone, func.count(SavedCopy.tone).label('count')).group_by(SavedCopy.tone).all()
                df_tone = pd.DataFrame(tone_data, columns=['tone', 'count'])
                
                chart_tone = alt.Chart(df_tone).mark_bar(cornerRadiusTopLeft=6, cornerRadiusTopRight=6).encode(
                    x=alt.X('tone:N', title='Tone'),
                    y=alt.Y('count:Q', title='Count'),
                    color=alt.value('#a855f7'),
                    tooltip=['tone', 'count']
                ).properties(height=260)
                st.altair_chart(chart_tone, use_container_width=True)
                
            # 3. Charts Row 2
            chart_col3, chart_col4 = st.columns(2)
            
            with chart_col3:
                st.markdown("##### 📈 Generations Over Time")
                # Group by date
                if db_path.startswith("sqlite"):
                    # SQLite date extraction
                    date_data = db_session.query(func.strftime('%Y-%m-%d', SavedCopy.timestamp).label('date'), func.count(SavedCopy.id).label('count')).group_by(func.strftime('%Y-%m-%d', SavedCopy.timestamp)).all()
                else:
                    # PostgreSQL date cast
                    date_data = db_session.query(cast(SavedCopy.timestamp, Date).label('date'), func.count(SavedCopy.id).label('count')).group_by(cast(SavedCopy.timestamp, Date)).order_by(cast(SavedCopy.timestamp, Date)).all()
                    
                df_date = pd.DataFrame(date_data, columns=['date', 'count'])
                # Make sure date column is a string for Altair charting
                df_date['date'] = df_date['date'].astype(str)
                
                chart_date = alt.Chart(df_date).mark_area(
                    line={'color':'#6366f1'},
                    color=alt.Gradient(
                        gradient='linear',
                        stops=[alt.GradientStop(color='#6366f1', offset=0),
                               alt.GradientStop(color='transparent', offset=1)],
                        x1=1, y1=1, x2=1, y2=0
                    )
                ).encode(
                    x=alt.X('date:O', title='Date'),
                    y=alt.Y('count:Q', title='Generations'),
                    tooltip=['date', 'count']
                ).properties(height=260)
                st.altair_chart(chart_date, use_container_width=True)
                
            with chart_col4:
                st.markdown("##### 🔥 Average Temperature per Platform")
                temp_data = db_session.query(SavedCopy.platform, func.avg(SavedCopy.temperature).label('avg_temp')).group_by(SavedCopy.platform).all()
                df_temp = pd.DataFrame(temp_data, columns=['platform', 'avg_temp'])
                df_temp['avg_temp'] = df_temp['avg_temp'].round(2)
                
                chart_temp = alt.Chart(df_temp).mark_bar(cornerRadiusTopLeft=6, cornerRadiusTopRight=6).encode(
                    x=alt.X('platform:N', title='Platform'),
                    y=alt.Y('avg_temp:Q', title='Avg Temperature'),
                    color=alt.value('#06b6d4'),
                    tooltip=['platform', 'avg_temp']
                ).properties(height=260)
                st.altair_chart(chart_temp, use_container_width=True)
                
    except Exception as stats_err:
        st.error(f"Analytics Error: {stats_err}")

# Cleanup DB connection at the end of execution
db_session.close()
