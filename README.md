# CivicAI — AI-Powered Local Governance Platform for Bengaluru

CivicAI is a full-stack civic intelligence platform that transforms complex BBMP (Bruhat Bengaluru Mahanagara Palike) governance documents into plain-language insights for everyday citizens. It combines a Retrieval-Augmented Generation (RAG) pipeline powered by NVIDIA NIM, a Next.js dashboard, and WhatsApp notifications — making local government transparent and accessible.

---

## Problem Statement

Local government decisions are technically public, but difficult for citizens to understand because of:

- Lengthy ward committee meeting minutes and budget reports with technical jargon
- Policy and bill documents scattered across multiple government portals
- No easy way to ask questions about civic data and get grounded, cited answers
- Residents missing deadlines for public comments or community meetings

CivicAI closes the gap between public transparency and public understanding.

---

## Solution

CivicAI ingests governance documents and live web data, indexes them in a vector store, and lets residents ask plain-English questions. Every answer is grounded in source documents with full citations.

Users can instantly find out:
- What changed in the latest council meeting?
- How does this budget affect my ward?
- What deadlines exist for public comment?
- When is the next community meeting?

---

## Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA SOURCES                               │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  /docs folder    │  │  bbmp.gov.in     │  │  Tavily Search   │  │
│  │  PDF / CSV / XLSX│  │  opendata.benscl │  │  (live web RAG)  │  │
│  │  BBMP datasets   │  │  (web scraper)   │  │                  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
└───────────┼──────────────────────┼──────────────────────┼───────────┘
            │                      │                      │
            ▼                      ▼                      │
┌─────────────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE                           │
│                                                                     │
│  pdf_loader.py ──► chunker.py (512 tok / 50 overlap, tiktoken)      │
│                         │                                           │
│                         ▼                                           │
│                embeddings.py                                        │
│         NVIDIA NeMo Retriever (nv-embedqa-e5-v5)                    │
│         1024-dim vectors via NVIDIA NIM API                         │
│                         │                                           │
│                         ▼                                           │
│              vector_store.py (ChromaDB)                             │
│              File-based, HNSW cosine distance                       │
│              Persisted to ./chroma_db                               │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
            ┌─────────────────▼──────────────────┐
            │        FASTAPI BACKEND              │
            │        civic-ai/backend/            │
            │                                     │
            │  POST /auth/token   — JWT login      │
            │  POST /ask          — RAG Q&A        │◄── Tavily web augment
            │  POST /ingest/file  — upload docs    │
            │  GET  /ingest/stats — index count    │
            │  GET  /market       — live ticker    │
            │  GET/POST /meetings — community mtgs │
            │  POST /meetings/{id}/notify          │
            │  GET/POST /subscribers               │
            │  POST /feedback                      │
            │  GET  /stats                         │
            └──────────────┬──────────────────────┘
                           │
          ┌────────────────┼────────────────────┐
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────┐ ┌────────────┐  ┌───────────────────────┐
│  data_fetch_    │ │summarizer  │  │  services/            │
│  service.py     │ │   .py      │  │  scheduler.py         │
│  ChromaDB query │ │  NVIDIA NIM│  │  APScheduler (2hr)    │
│  top-k retrieval│ │  Llama 3.3 │  │  scrape → embed →     │
│  cosine sim     │ │  70B via   │  │  notify               │
└─────────────────┘ │  NIM API   │  │                       │
                    └────────────┘  │  whatsapp_notifier.py │
                                    │  Meta WhatsApp Cloud  │
                                    │  API (broadcast)      │
                                    └───────────────────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  WhatsApp Webhook   │
                                    │  Node.js / Express  │
                                    │  whatsapp-webhook/  │
                                    │  Forwards msgs to   │
                                    │  FastAPI /ask       │
                                    └────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS DASHBOARD (Frontend)                     │
│                    civic-ai/dashboard/   (Next 16 / React 19)       │
│                                                                     │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ Ingest Docs │ │ Ask CIVIC AI │ │ Analytics  │ │  Broadcast   │  │
│  │ FileUploader│ │ QueryPanel   │ │ WordCloud  │ │ BroadcastPanel│ │
│  │ (organizer) │ │ RAG answers  │ │ BengaluruMap│ │ (organizer) │  │
│  │             │ │ + citations  │ │ recharts   │ │             │   │
│  └─────────────┘ └──────────────┘ └────────────┘ └──────────────┘  │
│                                                                     │
│  ┌──────────────┐  Ticker Bar: LiveDataTicker · MarketTicker        │
│  │  Meetings    │              IndiaMap · InlineChatbot             │
│  │  Organizer   │                                                   │
│  │  (organizer) │  Auth: JWT login · resident / organizer roles     │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Sources

| Source | Type | How Ingested |
|---|---|---|
| `/docs/` folder | PDF, CSV, XLSX | Manual upload via dashboard or `python -m rag_pipeline.ingestion` |
| BBMP datasets (3bfa8af5…csv, 92ec504c…csv) | CSV | Pre-loaded in `/docs` |
| BBMP Budget documents | PDF | Pre-loaded in `/docs` |
| BBMP Ward Committee Meeting minutes | CSV | Pre-loaded in `/docs` |
| Karnataka Bill/Policy documents | PDF | Pre-loaded in `/docs` |
| bbmp.gov.in | Live web (news, tenders, circulars, events) | Auto-scraped every 2 hours |
| opendata.benscl.com | Live web (dataset listings, data stories) | Auto-scraped every 2 hours |
| Tavily Search API | Real-time web | Per-query augmentation (optional) |

---

## RAG Pipeline — Step by Step

```
1. Document Load     pdf_loader.py  — pdfplumber extracts text + page numbers
2. Chunking          chunker.py     — 512 tokens / 50 overlap (tiktoken)
3. Embedding         embeddings.py  — NVIDIA nv-embedqa-e5-v5 → 1024-dim vectors
                                      input_type="passage" for indexing
                                      input_type="query"   for retrieval
4. Storage           vector_store.py — ChromaDB PersistentClient, HNSW cosine
5. Retrieval         data_fetch_service.py — top-k cosine similarity query
6. Web Augmentation  routes/query.py — optional Tavily search results
7. LLM Generation    summarizer.py  — meta/llama-3.3-70b-instruct via NVIDIA NIM
                                      structured Markdown output with citations
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| **UI Components** | framer-motion, lucide-react, recharts, react-leaflet (Leaflet maps) |
| **Backend** | FastAPI, Uvicorn, Python 3.11+ |
| **LLM** | `meta/llama-3.3-70b-instruct` via NVIDIA NIM (OpenAI-compatible API) |
| **Embeddings** | `nvidia/nv-embedqa-e5-v5` — 1024-dim via NVIDIA NIM |
| **Vector Store** | ChromaDB (file-based, HNSW cosine, no Docker required) |
| **Document Processing** | pdfplumber, tiktoken |
| **Web Scraping** | httpx, BeautifulSoup4, lxml |
| **Background Scheduler** | APScheduler (AsyncIOScheduler, 2-hour interval) |
| **Authentication** | python-jose (JWT), PBKDF2-HMAC-SHA256 password hashing |
| **WhatsApp** | Meta WhatsApp Cloud API (backend) + Express.js webhook (Node.js) |
| **Web Search Augmentation** | Tavily Search API |
| **HTTP Client** | httpx (async + sync) |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/token` | Public | Login — returns JWT |
| `POST` | `/ask` | resident | RAG Q&A with optional web augmentation |
| `POST` | `/ingest/file` | organizer | Upload PDF/CSV/XLSX for indexing |
| `GET` | `/ingest/stats` | Public | Number of indexed chunks |
| `GET` | `/market` | Public | Live USD/INR, gold, petrol, Sensex ticker |
| `GET` | `/meetings` | resident | List community meetings |
| `POST` | `/meetings` | organizer | Create a meeting |
| `DELETE` | `/meetings/{id}` | organizer | Delete a meeting |
| `POST` | `/meetings/{id}/notify` | organizer | WhatsApp blast to all subscribers |
| `GET/POST` | `/subscribers` | organizer | List / add WhatsApp subscribers |
| `POST` | `/feedback` | resident | Submit feedback |
| `GET` | `/stats` | Public | Application statistics |
| `GET` | `/health` | Public | Liveness probe |

---

## Auth Roles

| Role | Credentials (demo) | Access |
|---|---|---|
| `resident` | `resident` / `resident123` | `POST /ask`, `GET /meetings`, `POST /feedback` |
| `organizer` | `organizer` / `organizer123` | All endpoints including ingest, broadcast, meetings management |

Passwords are hashed with PBKDF2-HMAC-SHA256 (260,000 iterations). JWT tokens expire after 8 hours.

---

## Persistent Data Files

| File | Contents |
|---|---|
| `civic-ai/chroma_db/` | ChromaDB vector store (auto-managed) |
| `civic-ai/data/meetings.json` | Community meetings created via dashboard |
| `civic-ai/data/subscribers.json` | WhatsApp subscriber phone numbers (E.164) |
| `civic-ai/data/recent_questions.json` | Last 50 questions asked (with username + timestamp) |
| `civic-ai/data/scrape_state.json` | SHA-256 hashes for web scrape deduplication |
| `civic-ai/data/feedback.json` | User feedback submissions |

---

## Key Features

### RAG-Powered Q&A with Citations
Every answer from the LLM is grounded in retrieved document chunks. Responses are structured Markdown (`## Summary`, `## Key Details`, `## What This Means for Residents`, `## Sources`).

### Automatic Web Scraping
APScheduler runs every 2 hours, scraping BBMP and BenSCL portals. New items are detected via content hashing, chunked, embedded, and pushed into ChromaDB. WhatsApp subscribers are notified automatically.

### WhatsApp Integration
- **Backend**: Python `whatsapp_notifier.py` calls Meta WhatsApp Cloud API directly
- **Webhook**: Standalone Express.js server (`whatsapp-webhook/`) receives inbound messages and forwards them to FastAPI `/ask` — residents can ask civic questions via WhatsApp

### Live Financial Ticker
`GET /market` provides USD/INR (live, 5-minute TTL cache from open.er-api.com), gold price, petrol/diesel (Delhi retail), and BSE Sensex — displayed in the dashboard marquee ticker.

### Role-Based Access
Two JWT roles: `resident` (read/query) and `organizer` (full access — upload, broadcast, manage meetings). The dashboard auto-hides organizer-only tabs based on the decoded JWT role.

### XSS-Safe Web Scraping
The web scraper strips all HTML tags and JavaScript patterns (alert, eval, document.x, etc.) from scraped content before any storage or LLM injection — protecting against XSS payloads present on some government portals.

---

## Folder Structure

```
nvidia task/
│
├── README.md
├── model.py
│
├── civic-ai/                         # Main application
│   ├── config.py                     # Pydantic Settings (all env vars)
│   ├── requirements.txt              # Python dependencies
│   ├── API_KEYS_GUIDE.md
│   │
│   ├── backend/                      # FastAPI application
│   │   ├── main.py                   # App entry point, lifespan, CORS, router registration
│   │   ├── auth.py                   # JWT + PBKDF2-HMAC-SHA256 password hashing
│   │   ├── dependencies.py           # FastAPI dependency injection (DataFetchService)
│   │   └── routes/
│   │       ├── auth.py               # POST /auth/token
│   │       ├── query.py              # POST /ask  (RAG Q&A + Tavily augmentation)
│   │       ├── ingest.py             # POST /ingest/file, GET /ingest/stats
│   │       ├── meetings.py           # CRUD /meetings + WhatsApp notify
│   │       ├── subscribers.py        # GET/POST /subscribers
│   │       ├── market.py             # GET /market (USD/INR, gold, petrol, Sensex)
│   │       ├── stats.py              # GET /stats
│   │       └── feedback.py           # POST /feedback
│   │
│   ├── rag_pipeline/                 # Core RAG logic
│   │   ├── ingestion.py              # Full pipeline orchestrator (PDF + web)
│   │   ├── pdf_loader.py             # pdfplumber text extraction
│   │   ├── chunker.py                # Token-based chunking (tiktoken)
│   │   ├── embeddings.py             # NVIDIA nv-embedqa-e5-v5 via NIM API
│   │   ├── vector_store.py           # ChromaDB PersistentClient wrapper
│   │   ├── data_fetch_service.py     # Typed retrieval interface over ChromaDB
│   │   ├── summarizer.py             # LLM generation (Llama 3.3-70B via NIM)
│   │   └── web_scraper.py            # bbmp.gov.in + benscl scraper (XSS-safe)
│   │
│   ├── services/
│   │   ├── scheduler.py              # APScheduler — scrape every 2 hours
│   │   └── whatsapp_notifier.py      # Meta WhatsApp Cloud API client
│   │
│   ├── data/                         # Runtime JSON state files
│   │   ├── meetings.json             # Community meetings
│   │   ├── subscribers.json          # WhatsApp subscribers (E.164)
│   │   ├── recent_questions.json     # Last 50 questions asked
│   │   ├── scrape_state.json         # Scrape deduplication hashes
│   │   └── feedback.json             # User feedback
│   │
│   ├── docs/                         # Pre-loaded governance documents
│   │   ├── *.csv                     # BBMP open datasets
│   │   ├── BBMP Budget/              # Budget PDFs
│   │   ├── BBMP ward committee meetings/
│   │   └── Karnataka Bill Policy/
│   │
│   ├── chroma_db/                    # ChromaDB vector store (auto-managed)
│   │
│   ├── tests/
│   │   ├── test_auth.py
│   │   └── test_data_fetch_service.py
│   │
│   ├── dashboard/                    # Next.js 16 frontend
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout with ticker bar
│   │   │   ├── page.tsx              # Main dashboard (login + tabs)
│   │   │   ├── about/page.tsx
│   │   │   ├── feedback/page.tsx
│   │   │   └── privacy/page.tsx
│   │   ├── components/
│   │   │   ├── FileUploader.tsx      # Drag-and-drop document upload
│   │   │   ├── QueryPanel.tsx        # RAG Q&A interface
│   │   │   ├── Analytics.tsx         # Stats, word cloud, charts
│   │   │   ├── BroadcastPanel.tsx    # WhatsApp broadcast UI
│   │   │   ├── MeetingOrganizer.tsx  # Meeting CRUD + notify
│   │   │   ├── BengaluruMap.tsx      # Leaflet ward map
│   │   │   ├── WordCloud.tsx
│   │   │   └── ticker/
│   │   │       ├── LiveDataTicker.tsx
│   │   │       ├── MarketTicker.tsx  # USD/INR, gold, petrol, Sensex
│   │   │       ├── IndiaMap.tsx
│   │   │       ├── InlineChatbot.tsx
│   │   │       ├── CityStatsBanner.tsx
│   │   │       └── TickerItem.tsx
│   │   └── lib/
│   │       └── api.ts                # Typed API client (axios/fetch wrappers)
│   │
│   └── whatsapp-webhook/             # Inbound WhatsApp → FastAPI bridge
│       ├── src/
│       │   ├── index.js              # Express server entry point
│       │   └── whatsapp.js           # Message parsing + forwarding to /ask
│       └── package.json
│
└── volumes/                          # Milvus Docker volumes (unused in current stack)
    ├── etcd/
    ├── milvus/
    └── minio/
```

---

## Setup & Running

### Prerequisites
- Python 3.11+
- Node.js 18+
- NVIDIA NIM API key (get one at build.nvidia.com)
- (Optional) Tavily API key for live web augmentation
- (Optional) Meta WhatsApp Cloud API credentials

### Backend

```bash
cd civic-ai
cp .env.example .env        # add NVIDIA_API_KEY and other credentials
pip install -r requirements.txt

# Ingest documents from /docs
python -m rag_pipeline.ingestion --all

# Start API server
uvicorn backend.main:app --reload --port 8000
```

### Frontend Dashboard

```bash
cd civic-ai/dashboard
npm install
npm run dev                 # runs on http://localhost:3000
```

### WhatsApp Webhook (optional)

```bash
cd civic-ai/whatsapp-webhook
npm install
node src/index.js
```

### Run Tests

```bash
cd civic-ai
pytest tests/
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NVIDIA_API_KEY` | Yes | NVIDIA NIM API key |
| `NVIDIA_LLM_MODEL` | No | Default: `meta/llama-3.3-70b-instruct` |
| `NVIDIA_EMBEDDING_MODEL` | No | Default: `nvidia/nv-embedqa-e5-v5` |
| `NVIDIA_NIM_BASE_URL` | No | Default: `https://integrate.api.nvidia.com/v1` |
| `JWT_SECRET_KEY` | Yes (prod) | Secret for JWT signing |
| `TAVILY_API_KEY` | No | Enables live web augmentation in `/ask` |
| `WHATSAPP_ACCESS_TOKEN` | No | Meta WhatsApp Cloud API token |
| `WHATSAPP_PHONE_NUMBER_ID` | No | Meta phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | No | Webhook verification token |
| `CHROMA_PATH` | No | Default: `./chroma_db` |
| `DOCS_FOLDER` | No | Default: `./docs` |
| `SCRAPE_INTERVAL_HOURS` | No | Default: `2.0` |

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
