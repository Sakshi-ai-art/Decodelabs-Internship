# Custom AI Chatbot with Memory

A production-quality conversational AI Chatbot with sliding-window session memory, built using **Python**, **Streamlit**, and the **OpenAI API**. This application stores conversation history within Streamlit's session state, allows custom system prompt overrides, maintains sliding-window token/message protection, and includes analytics, export utilities, and a premium modern UI design.

This project is tailored for a BCA Data Science & AI student portfolio.

---

## 🌟 Features

- **Context Preservation**: Keeps track of previous messages during the session and passes the conversation history to the OpenAI model for a seamless, contextual chat experience.
- **Token Protection & Sliding Window**: Automatically prunes the oldest messages if the history exceeds 20 messages, preventing excessive token consumption and keeping costs controlled.
- **Credentials Validation**: Securely loads configuration credentials from environment variables (`.env`) or allows typing a temporary API key directly via a sidebar input field.
- **Export Utility**: Download your entire session conversation history dynamically as a styled `.txt` file straight from the browser.
- **Memory Statistics**: Track the exact count of user messages, assistant responses, word usage, and estimated token loads in real time.
- **Modern Responsive Design**: Custom CSS styling with custom badges, timestamps for messages, a progress memory status bar, and a sleek user interface.
- **Interactive UI Extras**:
  - Live typing text streaming.
  - Interactive notification logs (logged to `app.log` and standard output).
  - Quick action to clean chat history and reset memory.

---

## 📁 Folder Structure

```text
chatbot-memory/
│
├── app.py                # Main Streamlit application file
├── .env.example          # Environment variables template
├── requirements.txt      # Python dependencies list
├── README.md             # Project documentation and guide
└── assets/               # Folder for storing screenshots/icons
    └── .gitkeep          # Placeholder file to track directory in Git
```

---

## 🛠️ Installation Steps

### Prerequisites
Make sure you have Python 3.11+ installed on your computer.

1. **Clone or Navigate to the Directory**:
   ```bash
   cd c:\Users\P C\Desktop\chatbot-memory
   ```

2. **Create and Activate a Virtual Environment** (Recommended):
   On Windows:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

---

## 🔑 API Key Setup

1. Copy `.env.example` to a new file named `.env`:
   ```bash
   copy .env.example .env
   ```
2. Open the `.env` file in a text editor and enter your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-proj-yourActualKeyHere
   ```
3. *Alternative:* If you do not create a `.env` file, you can input your key in the secure password field in the sidebar of the chatbot while running.

---

## 🚀 Running the Application

To run the chatbot, execute the following command in your terminal:

```bash
streamlit run app.py
```

This will automatically spin up a local development server and open the app in your default web browser (typically at `http://localhost:8501`).

---

## ⚙️ How Session Memory Works
The application uses Streamlit's `st.session_state` to store conversation items in a structured list:
```python
[
  {"role": "user", "content": "Hello!", "timestamp": "12:30:15 PM"},
  {"role": "assistant", "content": "How can I help you?", "timestamp": "12:30:18 PM"}
]
```
Before making an API call, any user session metadata (like timestamps) is stripped out to comply with OpenAI standard payloads. If the length of the message array exceeds 20 items, the array is sliced to keep only the most recent 20 messages, ensuring optimal context preservation without overshooting model context window constraints.

---

## 📝 Logging Details
A dedicated logging handler writes runtime logs to `app.log` in the root directory. This log tracks:
- Application startup sequences
- Session initializations
- OpenAI completion starts (model used, size of the payload)
- API errors (connection timeouts, authentication errors, rate limiting)
- Conversation resets

---

## 📸 Screenshots

*Insert screenshots of the running application interface here:*
- **Main Chat Bubble Interface**
- **Sidebar Analytics and Memory Usage**
- **API Key and Custom Persona Settings**

---

## 🔮 Future Improvements

1. **Persistent SQL Database Storage**: Transition from in-memory session states to SQLite/PostgreSQL to retrieve historical conversations across multiple browser tabs/sessions.
2. **Context Summarization**: Instead of dropping oldest messages, use an LLM-guided summarizing agent to compress older messages into a compact system card, retaining high-level facts indefinitely.
3. **Multi-Model Support**: Expand support to other open-source or commercial model endpoints (e.g. Anthropic, Google Gemini, or local models via Ollama).
4. **Vector Database / RAG Integration**: Incorporate document upload support (PDF, TXT, CSV) utilizing vector databases like FAISS or ChromaDB for Retrieval-Augmented Generation.
