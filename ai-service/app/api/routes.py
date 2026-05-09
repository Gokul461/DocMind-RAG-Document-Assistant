import json
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.ingestion import ingest_document
from app.services.rag_engine import stream_rag_answer
from app.core.config import get_settings

router = APIRouter(prefix="/api")
settings = get_settings()

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}


@router.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported type. Allowed: {ALLOWED_EXTENSIONS}")

    file_bytes = await file.read()

    async def event_stream():
        async for event in ingest_document(file_bytes, file.filename):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class QueryRequest(BaseModel):
    question: str
    doc_ids: list[str] | None = None
    chat_history: list[dict] | None = None


@router.post("/query")
async def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    async def token_stream():
        async for token in stream_rag_answer(
            question=req.question,
            doc_ids=req.doc_ids,
            chat_history=req.chat_history,
        ):
            yield token

    return StreamingResponse(
        token_stream(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/documents")
async def list_documents():
    import chromadb
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    try:
        collection = client.get_collection("documents")
        result = collection.get(include=["metadatas"])
        seen = {}
        for meta in result["metadatas"]:
            doc_id = meta.get("doc_id")
            if doc_id and doc_id not in seen:
                seen[doc_id] = meta
        return {"documents": list(seen.values())}
    except Exception:
        return {"documents": []}


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    import chromadb
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    try:
        collection = client.get_collection("documents")
        collection.delete(where={"doc_id": doc_id})
        return {"deleted": doc_id, "status": "ok"}
    except Exception as e:
        raise HTTPException(500, f"Delete failed: {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "models": {"embedding": settings.embedding_model, "chat": settings.chat_model}}
