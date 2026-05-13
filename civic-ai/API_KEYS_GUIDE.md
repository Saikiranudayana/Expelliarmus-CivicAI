# CIVIC AI — Free API Keys Setup Guide

Everything in this project can be run at **zero cost** using free tiers.
Follow each section in order before running the app.

---

## 1. NVIDIA NIM API Key (Embeddings + Nemotron LLM)

Used for: `NVIDIA_API_KEY`

### Steps
1. Go to **https://build.nvidia.com**
2. Click **Sign In → Create Account** (free, no credit card)
3. After login, click your profile icon (top-right) → **API Key**
4. Click **Generate Key**
5. Copy the key — it starts with `nvapi-`

> **Free tier:** 1 000 API credits/month — enough for hundreds of questions
> and ingesting dozens of PDFs.

Paste into `.env`:
```
NVIDIA_API_KEY=nvapi-YOUR_KEY_HERE
```

---

## 2. Meta WhatsApp Cloud API (WhatsApp messaging)

Used for: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`

### Steps

#### 2a — Create a Meta Developer Account
1. Go to **https://developers.facebook.com**
2. Click **Get Started** → log in with your Facebook/Meta account (free)

#### 2b — Create an App
1. Go to **https://developers.facebook.com/apps**
2. Click **Create App**
3. Select type: **Business** → Next
4. Give it a name (e.g. `CIVIC AI`) → Create App

#### 2c — Add WhatsApp Product
1. On the app dashboard, scroll to **Add Products**
2. Click **Set Up** under **WhatsApp**
3. You will be on the **WhatsApp → Getting Started** page

#### 2d — Get your credentials
| Credential | Where to find it |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp → Getting Started → **Phone number ID** field |
| `WHATSAPP_ACCESS_TOKEN` | Same page → **Temporary access token** (valid 24 h) → for production use System User token (see note below) |

#### 2e — Set your Verify Token
This is **any string you choose** — you will enter the same string in two places:

1. In your `.env` file: `WHATSAPP_VERIFY_TOKEN=civic-ai-secret-2025`
2. In Meta Developer Console → WhatsApp → Configuration → Webhook → **Verify Token** field

> **Free tier:** 1 000 free business-initiated conversations/month.
> The test phone number Meta gives you works immediately — no approval needed.

> **Temporary vs Permanent token:**
> The token on the Getting Started page expires in 24 hours.
> For permanent tokens: Business Settings → System Users → Add → Generate Token → select your WhatsApp app → `whatsapp_business_messaging` permission.

Paste into `.env`:
```
WHATSAPP_VERIFY_TOKEN=civic-ai-secret-2025
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890123
```

---

## 3. ChromaDB — No API Key Needed

ChromaDB runs locally on your machine as a file database.
Data is saved automatically to the `./chroma_db` folder.

```
CHROMA_PATH=./chroma_db
CHROMA_COLLECTION=civic_ai_docs
```

Nothing to sign up for. ✓

---

## 4. JWT Secret Key — Generate It Yourself

Used for: `JWT_SECRET_KEY`

Run this **once** in your terminal to generate a strong random secret:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and paste it:
```
JWT_SECRET_KEY=the-64-character-hex-string-printed-above
```

Never share or commit this value.

---

## 5. Complete .env File (copy and fill in)

```env
# ── NVIDIA NIM ──────────────────────────────────
NVIDIA_API_KEY=nvapi-YOUR_KEY_HERE
NVIDIA_EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5
NVIDIA_LLM_MODEL=nvidia/nemotron-4-340b-instruct
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1

# ── ChromaDB (local, no signup) ─────────────────
CHROMA_PATH=./chroma_db
CHROMA_COLLECTION=civic_ai_docs

# ── Documents ───────────────────────────────────
DOCS_FOLDER=./docs
CHUNK_SIZE=512
CHUNK_OVERLAP=50

# ── JWT (generate with: python -c "import secrets; print(secrets.token_hex(32))") ──
JWT_SECRET_KEY=REPLACE_WITH_GENERATED_SECRET
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# ── WhatsApp (from developers.facebook.com) ─────
WHATSAPP_VERIFY_TOKEN=civic-ai-secret-2025
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890123

# ── Scheduler ───────────────────────────────────
SCRAPE_INTERVAL_HOURS=2
```

---

## 6. Quick Cost Summary

| Service | Free Tier | Limits |
|---|---|---|
| NVIDIA NIM (build.nvidia.com) | 1 000 credits/month | ~500 questions + PDF ingestion |
| Meta WhatsApp Cloud API | 1 000 conversations/month | More than enough for community pilot |
| ChromaDB | Unlimited (local file) | Limited only by disk space |
| JWT | Free (self-generated) | No limit |

**Total monthly cost: ₹0**

---

## 7. After Filling .env

```powershell
# 1. Copy the example
Copy-Item .env.example .env

# 2. Edit with your actual keys
notepad .env

# 3. Drop your BBMP PDF documents into the docs/ folder

# 4. Install all dependencies
pip install -r requirements.txt

# 5. Ingest PDFs + scrape BBMP website
python -m rag_pipeline.ingestion --all
```
