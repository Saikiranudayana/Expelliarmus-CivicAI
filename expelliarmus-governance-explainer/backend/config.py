import os
from dotenv import load_dotenv

load_dotenv()

NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL: str = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-super-120b-a12b")

POSTGRES_URL: str = os.getenv("POSTGRES_URL", "postgresql://user:password@localhost:5432/expelliarmus")

VECTOR_STORE_PATH: str = os.getenv("VECTOR_STORE_PATH", "data/processed/vectorstore")

CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "512"))
CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "64"))
