import asyncio
from typing import AsyncGenerator

from langchain_chroma import Chroma
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import get_settings

settings = get_settings()

DOC_SYSTEM = """You are DocMind, a precise document assistant.
Answer questions using ONLY the document excerpts provided below.
Always cite the page number your answer comes from using [Page N] notation.
If the answer is not present in the excerpts, say exactly:
I could not find that information in the uploaded documents.
Do not speculate or use outside knowledge.

--- Document Excerpts ---
{context}
--- End of Excerpts ---"""

CHAT_SYSTEM = """You are DocMind, a helpful and friendly AI assistant.
You can answer general questions, help with analysis, explain concepts, and have normal conversations.
If the user wants to query a specific document, let them know they can upload one using the Upload panel on the left.
Be concise, helpful and friendly."""


def _get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name=settings.embedding_model,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


def _build_chroma() -> Chroma:
    return Chroma(
        collection_name="documents",
        embedding_function=_get_embeddings(),
        persist_directory=settings.chroma_persist_dir,
    )


def _get_llm() -> ChatGroq:
    return ChatGroq(
        model=settings.chat_model,
        api_key=settings.groq_api_key,
        temperature=0.1,
        streaming=True,
    )


async def stream_rag_answer(
    question: str,
    doc_ids: list = None,
    chat_history: list = None,
) -> AsyncGenerator[str, None]:

    # Build history messages
    history_messages = []
    if chat_history:
        for turn in chat_history[-6:]:
            if turn["role"] == "user":
                history_messages.append(HumanMessage(content=turn["content"]))
            else:
                history_messages.append(AIMessage(content=turn["content"]))

    llm = _get_llm()

    # Try vector search only if docs exist
    try:
        vectorstore = await asyncio.to_thread(_build_chroma)
        where_filter = {"doc_id": {"": doc_ids}} if doc_ids else None

        retrieval_results = await asyncio.to_thread(
            vectorstore.similarity_search_with_score,
            question,
            k=settings.top_k_retrieval,
            filter=where_filter,
        )
    except Exception:
        retrieval_results = []

    # No documents found - fall back to normal chat
    if not retrieval_results:
        messages = [SystemMessage(content=CHAT_SYSTEM)]
        messages += history_messages
        messages.append(HumanMessage(content=question))

        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content

        yield "\n\n---\n*No documents uploaded. Upload a document to get cited answers.*"
        return

    # Documents found - RAG mode
    top_docs = [doc for doc, _ in retrieval_results[:settings.top_k_rerank]]

    context_parts = []
    for doc in top_docs:
        page = doc.metadata.get("page", "?")
        context_parts.append(f"[Page {page}]\n{doc.page_content}")
    context = "\n\n---\n\n".join(context_parts)

    messages = [SystemMessage(content=DOC_SYSTEM.format(context=context))]
    messages += history_messages
    messages.append(HumanMessage(content=question))

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content

    pages = sorted({str(d.metadata.get("page", "?")) for d in top_docs})
    yield f"\n\n---\n**Sources:** Pages {', '.join(pages)}"
