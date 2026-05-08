from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ai_pipeline.retrieval import retrieve_context
from ai_pipeline.summarizer import generate_answer

router = APIRouter()


class QueryRequest(BaseModel):
    query: str


@router.post("/")
def ask(request: QueryRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    context_chunks = retrieve_context(request.query)
    answer, citations = generate_answer(request.query, context_chunks)
    return {"answer": answer, "citations": citations}
