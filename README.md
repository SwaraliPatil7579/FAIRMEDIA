# FAIRMEDIA

**AI-Powered Bias Audit and Mitigation System**

FAIRMEDIA detects and explains bias in text content across 7 categories — gender, stereotype, age, disability, religious, socioeconomic, and language dominance — using a smart AI fallback chain (Gemini → Groq → rule-based).

---

## 🌐 Live Deployments

| Service | URL |
|---|---|
| **Web App (Frontend)** | https://fairmedia.vercel.app |
| **API (Backend)** | https://fairmedia.onrender.com |
| **API Docs (Swagger)** | https://fairmedia.onrender.com/docs |
| **Health Check** | https://fairmedia.onrender.com/health |

---

## 🧩 Browser Extension

Analyze any webpage for bias with one click, directly from your browser toolbar.

### Install on Chrome / Edge

1. Download or clone this repository
2. Open `chrome://extensions/` in Chrome (or `edge://extensions/` in Edge)
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `browser-extension/` folder from this repo
6. The FAIRMEDIA icon appears in your toolbar — click it on any page to analyze

### Install on Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to `browser-extension/` and select `manifest.json`

### What it does

- **One-click page analysis** — extracts page text and sends it to the API
- **Context menu** — right-click any selected text → "Analyze for Bias"
- **Score breakdown** — shows all 7 bias category scores with color-coded bars
- **Inline highlights** — marks biased phrases directly on the page
- **View full report** — opens the web app with detailed analysis

> The extension points to the production API (`https://fairmedia.onrender.com`) by default. You can change the API URL in the extension popup settings.

---

## ✨ Features

- Single content bias analysis
- Batch analysis (CSV / multiple texts)
- Live editor with real-time bias highlighting as you type
- URL content fetching — paste a URL, the backend extracts the text
- AI-powered detection with Gemini → Groq → rule-based fallback chain
- 7 bias category scores + overall score
- Highlighted biased text spans with severity
- Bias explanations and inclusive alternative suggestions
- Fairness score and risk-level calculation
- Mitigation weight generation for fair ranking
- Audit log storage for every analysis
- React dashboard: analyzer, live editor, batch, scores, review, ranking, reports, metrics, settings

---

## 🏗️ Architecture

```
Browser Extension / Web App (Vercel)
          │
          ▼
  FastAPI Backend (Render)
  https://fairmedia.onrender.com
          │
          ▼
  Pipeline Controller
  (orchestrates all services)
    ┌─────┴────────┬──────────────┐
    ▼              ▼              ▼
AI Adapter   Fairness Adapter  Storage Adapter
    │              │              │
    ▼              ▼              ▼
Unified AI     Fairness       Audit Logs
Service        Engine         (local JSON)
  │
  ├─ 1. Google Gemini 2.0 Flash  (primary)
  ├─ 2. Groq LLaMA 3.3 70B       (fallback)
  └─ 3. Rule-based mock           (always available)
```

---

## 📁 Project Structure

```
FAIRMEDIA/
├── backend/                    # FastAPI server
│   ├── main.py                 # App entry point
│   ├── config.py               # Settings via pydantic
│   ├── routes/
│   │   ├── analyze.py          # POST /api/v1/analyze
│   │   ├── batch_analyze.py    # POST /api/v1/batch-*
│   │   └── fetch_url.py        # POST /api/v1/fetch-url
│   ├── controller/
│   │   └── pipeline_controller.py
│   └── integration/
│       ├── ai_adapter.py
│       ├── fairness_adapter.py
│       └── storage_adapter.py
│
├── services/
│   ├── ai_engine/
│   │   ├── unified_ai_service.py   # Fallback chain
│   │   ├── gemini_ai_service.py
│   │   ├── groq_ai_service.py
│   │   ├── mock_ai_service.py
│   │   ├── enhanced_bias_detector.py
│   │   └── bias_lexicon.py
│   ├── fairness_engine/
│   │   ├── fairness_engine.py
│   │   ├── risk_engine.py
│   │   └── mitigation_utils.py
│   └── storage/
│       └── local_storage.py
│
├── schemas/                    # Pydantic models
│   ├── request_schema.py
│   ├── response_schema.py
│   ├── ai_schema.py
│   └── fairness_schema.py
│
├── frontend/                   # React + Vite + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── ContentAnalyzer.jsx
│       │   ├── LiveEditor.jsx
│       │   ├── BatchAnalyzer.jsx
│       │   ├── BiasScores.jsx
│       │   ├── HumanReview.jsx
│       │   ├── FairRanking.jsx
│       │   ├── AuditReports.jsx
│       │   ├── FairnessMetrics.jsx
│       │   └── Settings.jsx
│       ├── components/
│       └── api/api_client.js
│
├── browser-extension/          # Chrome / Edge / Firefox extension
│   ├── manifest.json           # Manifest V3
│   ├── popup.html / popup.js
│   ├── background.js
│   ├── content.js / content.css
│   └── icons/
│
├── data/audit_logs/            # Stored analysis results (gitignored)
├── Dockerfile
├── render.yaml                 # Render deployment config
├── requirements.txt
└── .env.example
```

---

## 🚀 Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm

### Backend

```bash
# Clone the repo
git clone https://github.com/SwaraliPatil7579/FAIRMEDIA---An-AI-powered-bias-audit-and-mitigation-system.git
cd FAIRMEDIA---An-AI-powered-bias-audit-and-mitigation-system

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
# Add your GEMINI_API_KEY and/or GROQ_API_KEY in .env

# Start the backend
python backend/main.py
```

Backend runs at `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# AI Keys (optional — falls back to rule-based if not set)
GEMINI_API_KEY=         # https://aistudio.google.com → Get API Key (free)
GROQ_API_KEY=           # https://console.groq.com (free)

# API Config
API_HOST=0.0.0.0
API_PORT=8000

# Storage
STORAGE_MODE=local
LOCAL_STORAGE_PATH=./data/audit_logs

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

---

## 📡 API Reference

### Health Check
```http
GET /health
```

### Analyze Content
```http
POST /api/v1/analyze
Content-Type: application/json

{
  "content": "The chairman said every businessman should man up.",
  "language": "en"
}
```

### Fetch URL Text
```http
POST /api/v1/fetch-url
Content-Type: application/json

{
  "url": "https://example.com/article"
}
```

### Batch Analyze
```http
POST /api/v1/batch-analyze
Content-Type: application/json
```

### Get Stored Analysis
```http
GET /api/v1/analyze/{analysis_id}
```

Full interactive docs: https://fairmedia.onrender.com/docs

---

## 🐳 Docker

```bash
docker build -t fairmedia .
docker run -p 8080:8080 --env-file .env fairmedia
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Lucide React |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Validation | Pydantic v2 |
| AI (primary) | Google Gemini 2.0 Flash |
| AI (fallback) | Groq LLaMA 3.3 70B |
| AI (last resort) | Rule-based bias detector |
| Browser Extension | Manifest V3 (Chrome, Edge, Firefox) |
| Deployment | Render (backend), Vercel (frontend) |
| Storage | Local filesystem (upgradable to S3/DynamoDB) |

---

## 📊 Bias Categories

| Category | Description |
|---|---|
| Gender bias | Gendered language and role assumptions |
| Stereotype | Group-based generalizations |
| Age bias | Assumptions based on age |
| Disability bias | Ableist language |
| Religious bias | Religious generalizations |
| Socioeconomic bias | Class-based assumptions |
| Language dominance | Linguistic exclusion |

---

## ⚠️ Current Limitations

- Storage is local filesystem by default (no database)
- No authentication or rate limiting yet
- Rule-based fallback is less context-aware than LLM analysis

---

## 🔮 Roadmap

- [ ] User authentication
- [ ] API rate limiting
- [ ] Database-backed audit logs (PostgreSQL)
- [ ] More language support
- [ ] Mobile app
- [ ] Team review workflows

---

## License

MIT
