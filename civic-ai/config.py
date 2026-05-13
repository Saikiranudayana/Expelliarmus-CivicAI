from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # NVIDIA NIM API
    NVIDIA_API_KEY: str
    NVIDIA_EMBEDDING_MODEL: str = "nvidia/nv-embedqa-e5-v5"
    NVIDIA_LLM_MODEL: str = "meta/llama-3.3-70b-instruct"
    NVIDIA_NIM_BASE_URL: str = "https://integrate.api.nvidia.com/v1"

    # Vector DB (ChromaDB — file-based, no Docker needed)
    # CHROMA_PATH: local directory where ChromaDB persists its data
    CHROMA_PATH: str = "./chroma_db"
    CHROMA_COLLECTION: str = "civic_ai_docs"

    # Document ingestion
    DOCS_FOLDER: str = "./docs"
    CHUNK_SIZE: int = 512       # tokens per chunk
    CHUNK_OVERLAP: int = 50     # overlapping tokens between consecutive chunks

    # JWT Auth
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # WhatsApp / Meta
    WHATSAPP_VERIFY_TOKEN: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""

    # Web scraping scheduler
    SCRAPE_INTERVAL_HOURS: float = 2.0   # how often to scrape BBMP + BenSCL

    # Tavily Search API (web augmentation for RAG)
    TAVILY_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
