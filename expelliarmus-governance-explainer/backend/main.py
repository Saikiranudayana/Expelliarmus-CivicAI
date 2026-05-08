from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import ingest, query

app = FastAPI(
    title="Expelliarmus API",
    description="AI-powered civic intelligence backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
app.include_router(query.router, prefix="/ask", tags=["query"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
