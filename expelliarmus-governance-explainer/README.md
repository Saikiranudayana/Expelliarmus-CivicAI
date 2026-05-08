# Expelliarmus: AI-Powered Local Governance Explainer

Expelliarmus is an AI-powered civic intelligence platform that transforms complex public governance documents into simple, understandable insights for everyday citizens.

## Problem Statement

Local government decisions are technically public, but often difficult for citizens to understand due to:

- Lengthy city council meeting minutes
- Complex policy documents
- Budget reports with technical jargon
- Scattered updates across multiple sources
- Lack of clear action items for residents

This creates a gap between public transparency and public understanding.

## Solution

Expelliarmus ingests governance-related public documents and converts them into plain-language explanations.

Users can instantly understand:

- What changed?
- Who is affected?
- Why does this matter?
- What actions can residents take?
- When is the next public meeting?
- What deadlines exist?

## Key Features

### Document Intelligence
- PDF / DOCX ingestion
- OCR support for scanned documents
- Multi-document analysis
- Semantic chunking
- Metadata extraction

### AI Summarization
- Plain-English summaries
- Key decision extraction
- Stakeholder impact analysis
- Timeline extraction
- Action item detection

### Fact Traceability
Every generated explanation includes:
- Source references
- Supporting document sections
- Evidence mapping

### Bias Control
- Neutral summarization
- Fact-preserving responses
- Hallucination reduction pipeline

### Q&A Assistant
Ask questions like:
- "What happened in the latest council meeting?"
- "Does this affect local taxes?"
- "Any public comment deadlines?"

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Streamlit |
| Backend | FastAPI |
| LLM | NVIDIA NIM (Nemotron) via OpenAI-compatible API |
| Embeddings | NVIDIA NV-EmbedQA-E5 |
| Vector Store | FAISS |
| Document Processing | PyMuPDF, python-docx, Tesseract OCR |
| Database | PostgreSQL |
| Deployment | Docker / docker-compose |

## Architecture

```
User Query
    ↓
Streamlit Frontend
    ↓
FastAPI Backend  (/ask  /ingest)
    ↓
Document Ingestion Pipeline
    ↓
OCR + Text Extraction (PyMuPDF / Tesseract)
    ↓
Chunking + Embeddings (NVIDIA NV-EmbedQA-E5)
    ↓
FAISS Vector Store
    ↓
LLM Reasoning Layer (NVIDIA Nemotron)
    ↓
Response + Source Citations
```

## Folder Structure

```
expelliarmus-governance-explainer/
│
├── frontend/
│   ├── app.py               # Streamlit UI
│   ├── components/
│   └── assets/
│
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── routes/
│   │   ├── ingest.py        # POST /ingest
│   │   └── query.py         # POST /ask
│   ├── services/
│   ├── utils/
│   └── config.py            # Environment config
│
├── data/
│   ├── raw/                 # Uploaded source documents
│   ├── processed/           # FAISS index + metadata
│   └── sample_docs/         # Sample governance documents for testing
│
├── ai_pipeline/
│   ├── ingestion.py         # PDF/DOCX extraction + OCR
│   ├── chunking.py          # Semantic chunking with overlap
│   ├── embeddings.py        # Embedding generation + FAISS storage
│   ├── retrieval.py         # Top-K context retrieval
│   ├── summarizer.py        # LLM answer generation
│   └── citation_engine.py   # Source citation builder
│
├── tests/
│   └── test_pipeline.py
│
├── requirements.txt
├── .env.example
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── README.md
```

## Installation

```bash
git clone https://github.com/yourusername/expelliarmus-governance-explainer.git
cd expelliarmus-governance-explainer
cp .env.example .env          # fill in your NVIDIA_API_KEY
pip install -r requirements.txt
```

> **Tesseract OCR** must also be installed on your system:
> - Windows: https://github.com/UB-Mannheim/tesseract/wiki
> - Ubuntu: `sudo apt install tesseract-ocr`

## Run (local)

**Backend:**
```bash
uvicorn backend.main:app --reload
```

**Frontend:**
```bash
streamlit run frontend/app.py
```

## Run (Docker)

```bash
docker-compose up --build
```

## Run Tests

```bash
pytest tests/
```

## Evaluation Metrics

| Metric | Description |
|---|---|
| Fact consistency score | % of claims verifiable against source |
| Omission rate | Major decisions missed in summaries |
| Reading-grade level | Target ≤ grade 8 |
| User comprehension | % of users who correctly answered follow-up Qs |
| Citation coverage | % of responses with at least one source reference |

## Future Improvements

- Multilingual support
- Voice assistant for accessibility
- Live public meeting integration
- Email alerts for governance updates
- Regional personalization

---

*Building civic transparency through AI — Team Expelliarmus*
