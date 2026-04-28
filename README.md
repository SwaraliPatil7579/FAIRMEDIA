# FAIRMEDIA  
## AI-Powered Bias Audit & Responsible Content Ranking System  
### 🌟 Powered by Google Gemini AI

> **Reducing algorithmic bias without altering reality.**

[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-4285F4.svg)](https://ai.google.dev/)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚨 Problem

Modern AI systems learn from biased internet data containing:

- **Gender bias** - Stereotypical gender roles and gendered language
- **Stereotypes** - Cultural, racial, and occupational biases
- **Language dominance** - English-centric and culturally dominant patterns
- **Under-representation** - Marginalized communities and perspectives

This leads to **algorithmic discrimination**, unfair ranking, and distorted digital visibility.

---

## 💡 Solution

**FAIRMEDIA** is a **Responsible AI system** powered by **Google Gemini 2.0** that:

✅ **Google Gemini AI** - Advanced bias detection using Google's latest LLM  
✅ Detects bias using **NLP + Machine Learning**  
✅ Provides **Explainable AI (XAI) bias scores**  
✅ Applies **Smart Re-weighting algorithms**  
✅ Enables **Fairness-aware content ranking**  
✅ Maintains **Human-in-the-Loop oversight**  
✅ Supports **Multilingual & regional language inclusion**  
✅ **Intelligent Fallback Chain**: Gemini → Groq (LLaMA 3) → Rule-based  

⚠️ We do **NOT** edit or delete content.  
✅ We reduce bias at the **AI decision layer**, not the content layer.

---

## 🌟 Google Gemini AI Integration

### Primary AI Model: Google Gemini 2.0 Flash Lite
- ✅ **Advanced Bias Detection** - Powered by Google's latest multimodal LLM
- ✅ **Context-Aware Analysis** - Deep understanding of nuanced language patterns
- ✅ **Real-time Processing** - Fast inference with Google AI Studio
- ✅ **FREE Tier** - No Google Cloud account required, uses AI Studio API
- ✅ **Intelligent Fallback** - Automatic switch to Groq (LLaMA 3) if quota exceeded
- ✅ **Zero Downtime** - Rule-based fallback ensures continuous service

### How It Works
1. **Primary**: Google Gemini analyzes content for bias patterns
2. **Fallback**: If Gemini quota exceeded → Groq LLaMA 3 takes over
3. **Safety Net**: If both fail → Rule-based system ensures response

### Future Google Cloud Enhancements
- 🔄 **Vertex AI** - Custom bias detection models
- 🔄 **BigQuery** - Analytics and trend analysis
- 🔄 **Cloud Translation** - 100+ language support
- 🔄 **Firestore** - Real-time monitoring
- 🔄 **Pub/Sub** - Event-driven alerts

**Current Status**: Running with **Google Gemini 2.0 Flash Lite** via AI Studio (FREE)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│              (Interactive Bias Analysis UI)              │
│                     Port 3000                            │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                         │
│            (Pipeline Controller & API)                   │
│                     Port 8000                            │
└──────────┬──────────────┬──────────────┬────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │   AI     │   │ Fairness │   │ Storage  │
    │ Service  │   │  Engine  │   │ Adapter  │
    │          │   │          │   │          │
    │ • Gemini │   │ • Risk   │   │ • Local  │
    │ • Groq   │   │ • Weights│   │ • AWS    │
    │ • Mock   │   │ • Metrics│   │ • Cloud  │
    └──────────┘   └──────────┘   └──────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Google Gemini 2.0 Flash Lite                │
│                  (via AI Studio API)                     │
│         Primary AI Model for Bias Detection              │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Core Modules

### 1. **Bias Detection Engine** (Powered by Google Gemini)
- **Google Gemini 2.0** - Primary AI model for advanced bias detection
- NLP-based gender & language bias detection
- Pattern matching for stereotypes
- Language dominance analysis
- Intelligent fallback to Groq LLaMA 3 and rule-based systems

### 2. **Explainable Bias Scoring**
- Transparent word-level explanations
- Highlighted text spans showing bias sources
- Confidence scores and severity levels
- Multiple bias type categorization

### 3. **Smart Re-weighting (ML-Based)**
- Fair influence adjustment algorithms
- Risk-based weight calculation
- Minimum weight thresholds
- Rationale generation for adjustments

### 4. **Fair Content Ranking**
- Bias-aware re-ranking system
- Fairness score calculation
- Detailed metrics per bias type
- Actionable recommendations

### 5. **Human Approval Layer**
- Ethical control mechanism
- Audit log storage
- Review workflow support
- Complete analysis history

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd FAIRMEDIA

# Backend setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install
cd ..

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

### Run Application

```bash
# Option 1: Use startup script (Linux/Mac)
./run_local.sh

# Option 2: Manual startup
# Terminal 1 - Backend
python backend/main.py

# Terminal 2 - Frontend
cd frontend && npm start
```

### Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📡 API Usage

### Analyze Content

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The CEO announced that his company will hire more female engineers.",
    "language": "en"
  }'
```

### Response

```json
{
  "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-02-28T10:35:42Z",
  "bias_detection": {
    "bias_scores": {
      "gender_bias": 0.65,
      "stereotype": 0.42,
      "language_dominance": 0.28,
      "overall": 0.52
    },
    "explanations": {
      "gender_bias": "Gendered language patterns detected",
      "stereotype": "Stereotypical associations identified",
      "language_dominance": "English-centric references found"
    },
    "highlighted_text": [...]
  },
  "fairness_metrics": {
    "risk_level": "medium",
    "fairness_score": 0.48,
    "recommendations": [
      "Use gender-neutral language",
      "Review stereotypical associations",
      "Include diverse perspectives"
    ],
    "mitigation_weights": {
      "original_weight": 1.0,
      "adjusted_weight": 0.75,
      "adjustment_factor": 0.25
    }
  },
  "status": "completed"
}
```

---

## 🧠 Tech Stack

### AI/ML (Primary)
- **Google Gemini 2.0 Flash Lite** - Primary bias detection model
- **Groq LLaMA 3** - Secondary fallback model
- **spaCy / NLTK** - NLP processing
- **Pattern Matching** - Rule-based detection fallback

### Backend
- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation and settings
- **Python 3.9+** - Core language

### Frontend
- **React 18** - UI library
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client

### Cloud Infrastructure
- **Google AI Studio** - Gemini API hosting (FREE tier)
- **AWS S3** - Object storage for audit logs (optional)
- **AWS DynamoDB** - NoSQL database for metadata (optional)
- **Local Storage** - Default storage mode (no cloud required)

### DevOps
- **Docker** - Containerization
- **Uvicorn** - ASGI server
- **Git** - Version control

---

## 📁 Project Structure

```
FAIRMEDIA/
├── backend/                 # FastAPI backend
│   ├── aws/                # AWS service clients
│   ├── controller/         # Pipeline orchestration
│   ├── integration/        # Service adapters
│   ├── routes/             # API endpoints
│   └── main.py             # Entry point
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   └── api/            # API client
│   └── package.json
├── services/               # Core services
│   ├── ai_engine/          # Bias detection
│   ├── fairness_engine/    # Fairness calculations
│   └── storage/            # Data persistence
├── schemas/                # Data models
├── infra/                  # Infrastructure docs
├── tests/                  # Test suite
└── requirements.txt        # Dependencies
```

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov=services

# Run specific test
pytest tests/test_ai_engine.py
```

---

## 🚢 Deployment

### Local Development
```bash
./run_local.sh
```

### AWS Deployment
See [infra/aws_setup.md](infra/aws_setup.md) for:
- DynamoDB table setup
- S3 bucket configuration
- Bedrock model access
- Lambda deployment
- API Gateway setup

See [infra/deployment_steps.md](infra/deployment_steps.md) for:
- EC2 deployment
- Docker deployment
- ECS/EKS deployment

---

## 🎯 Key Keywords

**Responsible AI • Fairness in AI • Algorithmic Bias Detection • Explainable AI (XAI) • Ethical AI • NLP • Bias Mitigation • Smart Re-weighting • Human-in-the-Loop • Multilingual AI • Fair Ranking Systems**

---

## 🚀 Impact

- Promotes **ethical AI deployment**
- Improves **digital fairness & representation**
- Reduces **bias amplification**
- Scalable for **news, search, and recommendation systems**
- Provides **transparency and accountability**

---

## 📊 Features

### Bias Detection
- ✅ Gender bias detection
- ✅ Stereotype identification
- ✅ Language dominance analysis
- ✅ Text span highlighting
- ✅ Confidence scoring

### Fairness Metrics
- ✅ Risk level assessment (low/medium/high/critical)
- ✅ Fairness score calculation
- ✅ Weight adjustment algorithms
- ✅ Actionable recommendations
- ✅ Detailed metrics per bias type

### Storage & Audit
- ✅ Local JSON storage
- ✅ AWS DynamoDB + S3
- ✅ Complete audit trail
- ✅ Analysis history
- ✅ Metadata indexing

### User Interface
- ✅ Interactive analysis dashboard
- ✅ Real-time bias visualization
- ✅ Highlighted text display
- ✅ Recommendation cards
- ✅ Fairness metrics charts

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

For issues and questions:
- Check the [documentation](infra/)
- Review [API docs](http://localhost:8000/docs)
- Open an issue on GitHub

---

## 📈 Roadmap

- [ ] Multi-language support (Spanish, French, German, etc.)
- [ ] Real-time analysis streaming
- [ ] Custom bias pattern definitions
- [ ] Integration with CMS platforms
- [ ] Advanced visualization dashboards
- [ ] Batch processing API
- [ ] Webhook notifications
- [ ] Mobile app support

---

## ⭐ Vision

**FAIRMEDIA — Making AI fair, transparent, and accountable.**

---

Made with ❤️ for a fairer digital world
