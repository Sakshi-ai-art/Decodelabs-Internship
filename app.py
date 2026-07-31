import os
import time
import logging
from datetime import datetime
import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI, APIConnectionError, RateLimitError, AuthenticationError, APIError

# =====================================================================
# 1. LOGGING CONFIGURATION
# =====================================================================
# Configure logging to write to both a file (app.log) and the console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("app.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ChatbotMemoryApp")

# Log general application startup at the module load time
logger.info("Application starting up...")

# =====================================================================
# 2. ENVIRONMENT & CONFIGURATION SETUP
# =====================================================================
# Load environment variables from a .env file if it exists
load_dotenv()

# Set up page configurations
st.set_page_config(
    page_title="AI Chatbot with Memory",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS styling for modern and premium UI aesthetics (including dark/light mode adaptations)
st.markdown(
    """
    <style>
    /* Styling headers and page layout */
    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
    }
    
    /* Premium Header Container */
    .header-container {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
        border-radius: 16px;
        color: white;
        margin-bottom: 25px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .header-logo {
        background-color: rgba(255, 255, 255, 0.2);
        padding: 12px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .header-title-section h1 {
        margin: 0 !important;
        font-size: 24px !important;
        font-weight: 700 !important;
        color: white !important;
    }
    
    .header-title-section p {
        margin: 0 !important;
        font-size: 14px !important;
        opacity: 0.9;
    }

    /* Message timestamp badge styles */
    .msg-timestamp {
        font-size: 0.75rem;
        color: #888888;
        margin-top: 4px;
        display: block;
    }
    
    /* Sidebar adjustments */
    .sidebar .sidebar-content {
        background-color: #f8fafc;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# =====================================================================
# 3. SESSION STATE INITIALIZATION
# =====================================================================
# Track session startup to log only once per user session
if "session_started" not in st.session_state:
    st.session_state.session_started = True
    logger.info("New User Session started.")

# Initialize the main message list if it doesn't exist
if "messages" not in st.session_state:
    st.session_state.messages = []
    logger.info("Initialized empty message history in session state.")

# Keep track of custom app settings (e.g. system prompt, model selection)
if "system_prompt" not in st.session_state:
    st.session_state.system_prompt = "You are a helpful, friendly, and intelligent AI assistant."

# =====================================================================
# 4. SIDEBAR - SETTINGS, STATS, AND ACTIONS
# =====================================================================
st.sidebar.title("🛠️ Chatbot Settings")

# 4.1 OpenAI API Key setup (Priority: User input box -> .env file)
api_key_from_env = os.getenv("OPENAI_API_KEY", "")
st.sidebar.subheader("🔑 Credentials")

api_key_input = st.sidebar.text_input(
    "Enter OpenAI API Key:",
    type="password",
    value=api_key_from_env if api_key_from_env else "",
    help="Provided API key overrides the key in the .env file if specified."
)

active_api_key = api_key_input if api_key_input else api_key_from_env

# Check for API Key presence
if not active_api_key:
    st.sidebar.warning("⚠️ No OpenAI API Key found. Please enter one above or configure it in the .env file.")

# 4.2 Model Selection
st.sidebar.subheader("🤖 Model Configuration")
selected_model = st.sidebar.selectbox(
    "Choose GPT Model:",
    ["gpt-4o-mini", "gpt-4o"],
    index=0,
    help="gpt-4o-mini is highly recommended: fast, cost-effective, and highly intelligent."
)

# 4.3 Custom System Prompt (Allows customizing assistant behavior)
custom_system = st.sidebar.text_area(
    "System Prompt / Role:",
    value=st.session_state.system_prompt,
    help="Define the chatbot's persona or goals."
)
if custom_system != st.session_state.system_prompt:
    st.session_state.system_prompt = custom_system
    logger.info(f"System prompt updated to: {custom_system}")

# 4.4 Memory Window Status Indicator (Requirement 8: Token Protection)
st.sidebar.subheader("🧠 Memory Status")
num_messages = len(st.session_state.messages)
# Max 20 messages limit
memory_percentage = min(num_messages / 20, 1.0)
st.sidebar.progress(memory_percentage)
st.sidebar.caption(f"Session history usage: **{num_messages} / 20** messages.")

if num_messages >= 20:
    st.sidebar.info("💡 Sliding window active: The oldest messages will be auto-pruned to maintain current context.")

# 4.5 Statistics Section (Bonus Requirement 2 & 3)
st.sidebar.subheader("📊 Session Statistics")
with st.sidebar.expander("View Stats", expanded=True):
    user_msgs_count = sum(1 for m in st.session_state.messages if m["role"] == "user")
    assistant_msgs_count = sum(1 for m in st.session_state.messages if m["role"] == "assistant")
    
    # Calculate word counts
    words_count = sum(len(m["content"].split()) for m in st.session_state.messages)
    estimated_tokens = int(words_count * 1.3)
    
    st.write(f"💬 **User Messages:** {user_msgs_count}")
    st.write(f"🤖 **Assistant Responses:** {assistant_msgs_count}")
    st.write(f"📝 **Total Words Used:** {words_count}")
    st.write(f"⚡ **Est. Context Tokens:** {estimated_tokens}")

# 4.6 Conversation Management: Clear & Export Actions (Requirements 6 & 7)
st.sidebar.subheader("💾 Actions")

# Action 1: Clear Chat
if st.sidebar.button("🧹 Clear Conversation", use_container_width=True):
    st.session_state.messages = []
    logger.info("Session state cleared by user.")
    st.toast("Conversation history cleared!", icon="🧹")
    time.sleep(0.5)
    st.rerun()

# Action 2: Export Chat (Generate downloadable content string)
def generate_export_text():
    export_lines = []
    export_lines.append("=========================================")
    export_lines.append("        AI CHATBOT WITH MEMORY - LOG      ")
    export_lines.append(f"        Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    export_lines.append(f"        Model: {selected_model}")
    export_lines.append("=========================================\n")
    
    for msg in st.session_state.messages:
        role = msg["role"].upper()
        time_str = msg.get("timestamp", "No Timestamp")
        content = msg["content"]
        export_lines.append(f"[{time_str}] {role}:")
        export_lines.append(content)
        export_lines.append("-" * 50)
        
    return "\n".join(export_lines)

if num_messages > 0:
    chat_export_data = generate_export_text()
    st.sidebar.download_button(
        label="📥 Download Chat (.txt)",
        data=chat_export_data,
        file_name=f"chat_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
        mime="text/plain",
        use_container_width=True
    )
else:
    st.sidebar.button("📥 Download Chat (.txt)", disabled=True, use_container_width=True)

# =====================================================================
# 5. MAIN CHAT INTERFACE
# =====================================================================
# Premium banner top header
st.markdown(
    """
    <div class="header-container">
        <div class="header-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
        </div>
        <div class="header-title-section">
            <h1>BrainyChat AI</h1>
            <p>Smart, responsive conversational assistant with a rolling session memory window.</p>
        </div>
    </div>
    """,
    unsafe_allow_html=True
)

# Display a notice if there are no messages
if not st.session_state.messages:
    st.info("👋 Hello! Type your message in the chatbox below to start our conversation. I'll remember our conversation context as we chat!")

# Render message history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        # Display small timestamp (Bonus Requirement 5)
        st.markdown(f'<span class="msg-timestamp">{message.get("timestamp", "")}</span>', unsafe_allow_html=True)

# Check for user input
if prompt := st.chat_input("What is on your mind?"):
    if not active_api_key:
        st.error("🔑 OpenAI API Key is missing! Please enter a valid key in the sidebar configuration to execute messages.")
        logger.error("User attempted to send message, but API Key was missing.")
    else:
        # 1. Capture current timestamp
        current_time = datetime.now().strftime("%I:%M:%S %p")
        
        # 2. Append user message to history (Requirement 4.1)
        st.session_state.messages.append({
            "role": "user",
            "content": prompt,
            "timestamp": current_time
        })
        logger.info(f"User message added: '{prompt[:30]}...'")
        
        # Render user message immediately
        with st.chat_message("user"):
            st.markdown(prompt)
            st.markdown(f'<span class="msg-timestamp">{current_time}</span>', unsafe_allow_html=True)
            
        # 3. Token protection / sliding window prune (Requirement 8)
        # If history exceeds 20 messages, keep the last 20 messages.
        if len(st.session_state.messages) > 20:
            removed_count = len(st.session_state.messages) - 20
            st.session_state.messages = st.session_state.messages[-20:]
            logger.info(f"Sliding window triggered. Pruned oldest {removed_count} message(s). Current count: 20.")

        # 4. Prepare chat payload for the API
        # Always inject the system prompt first to direct behavior
        api_messages = [{"role": "system", "content": st.session_state.system_prompt}]
        for msg in st.session_state.messages:
            api_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
            
        # 5. Fetch response from OpenAI with streaming and robust error handling
        with st.chat_message("assistant"):
            # Create standard Streamlit placeholder for assistant typing
            message_placeholder = st.empty()
            full_response = ""
            
            # Setup client
            try:
                client = OpenAI(api_key=active_api_key)
                
                logger.info(f"Sending API request to OpenAI ({selected_model}) with history length {len(api_messages)}.")
                
                # Perform streaming request (Bonus Requirement 4: Typing Indicator using stream chunks)
                stream = client.chat.completions.create(
                    model=selected_model,
                    messages=api_messages,
                    stream=True
                )
                
                # Display chunk-by-chunk stream response
                for chunk in stream:
                    if chunk.choices and len(chunk.choices) > 0:
                        content_chunk = chunk.choices[0].delta.content
                        if content_chunk is not None:
                            full_response += content_chunk
                            message_placeholder.markdown(full_response + "▌")
                            
                # Finish typing indication and write final response
                if full_response.strip() == "":
                    # Empty response exception fallback
                    raise ValueError("The assistant returned an empty response.")
                    
                message_placeholder.markdown(full_response)
                
                # Render timestamp for assistant message
                assistant_time = datetime.now().strftime("%I:%M:%S %p")
                st.markdown(f'<span class="msg-timestamp">{assistant_time}</span>', unsafe_allow_html=True)
                
                # 6. Save assistant response to session state (Requirement 4)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": full_response,
                    "timestamp": assistant_time
                })
                logger.info(f"Assistant response successfully generated & appended ({len(full_response)} chars).")
                
                # Trigger a refresh of sidebar metrics by rerunning
                st.rerun()

            except AuthenticationError as auth_err:
                logger.error(f"Authentication Failure: {auth_err}")
                message_placeholder.error(
                    "❌ **Authentication Error:** The OpenAI API Key provided is invalid or has expired. "
                    "Please check your API key and update it in the sidebar."
                )
            except RateLimitError as rate_err:
                logger.error(f"Rate Limit Failure: {rate_err}")
                message_placeholder.error(
                    "❌ **Rate Limit Exceeded:** You've reached your OpenAI API limits. "
                    "Please check your API billing status or wait a moment before trying again."
                )
            except APIConnectionError as conn_err:
                logger.error(f"Connection Failure: {conn_err}")
                message_placeholder.error(
                    "❌ **Connection Error:** Could not connect to OpenAI services. "
                    "Please check your internet connection or try again later."
                )
            except APIError as api_err:
                logger.error(f"General API Failure: {api_err}")
                message_placeholder.error(
                    f"❌ **API Error:** An unexpected OpenAI service error occurred: {api_err.message}"
                )
            except Exception as ex:
                logger.error(f"Unexpected Failure: {ex}")
                message_placeholder.error(
                    f"❌ **Unexpected Error:** An error occurred while retrieving a response. Details: {str(ex)}"
                )
