from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
import os

app = FastAPI(
    title="DocMind AI Service",
    description="RAG pipeline: Parse -> Chunk -> Embed -> Retrieve -> Rerank -> Generate",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup():
    from app.core.config import get_settings
    settings = get_settings()
    os.makedirs(settings.chroma_persist_dir, exist_ok=True)
    print(f"ChromaDB persisting to: {settings.chroma_persist_dir}")
    print(f"Embedding model: {settings.embedding_model}")
    print(f"Chat model:      {settings.chat_model}")
    print("DocMind AI Service ready - http://localhost:8000/docs")
