from fastapi import APIRouter, UploadFile, File, HTTPException
from ai_pipeline.ingestion import ingest_document

router = APIRouter()


@router.post("/")
async def ingest(file: UploadFile = File(...)):
    if file.content_type not in (
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ):
        raise HTTPException(status_code=415, detail="Only PDF and DOCX files are supported.")

    contents = await file.read()
    result = ingest_document(contents, filename=file.filename)
    return {"status": "ingested", "chunks": result["chunks"]}
