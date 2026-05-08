"""
LLM summarization layer using NVIDIA NIM via the OpenAI-compatible API.
Produces plain-English answers with fact-preserving, neutral summarization.
"""
from typing import List, Tuple
from openai import OpenAI
from backend.config import NVIDIA_API_KEY, NVIDIA_BASE_URL, NVIDIA_MODEL
from ai_pipeline.citation_engine import build_citations

_client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=NVIDIA_API_KEY)

SYSTEM_PROMPT = """You are Expelliarmus, a neutral civic intelligence assistant.
Your role is to help everyday citizens understand local government documents.
Rules:
- Use plain, jargon-free language (aim for 8th-grade reading level).
- Be strictly factual; do not infer, speculate, or add opinion.
- Cite the source document sections you used (reference them as [1], [2], etc.).
- If the context does not contain enough information to answer, say so clearly.
- Structure your answer around: What changed? Who is affected? Why does it matter? What can residents do? Any deadlines?
"""


def generate_answer(query: str, context_chunks: List[dict]) -> Tuple[str, List[str]]:
    """
    Generate a plain-English answer grounded in the retrieved chunks.
    Returns (answer_text, citation_list).
    """
    if not context_chunks:
        return (
            "I could not find relevant information in the ingested documents. "
            "Please upload a governance document first.",
            [],
        )

    context_text = ""
    for i, chunk in enumerate(context_chunks, 1):
        context_text += f"[{i}] (Source: {chunk['source']}, chunk {chunk['chunk_index']})\n{chunk['text']}\n\n"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Context documents:\n{context_text}\n"
                f"Citizen question: {query}\n\n"
                "Provide a clear, plain-English answer with inline citations."
            ),
        },
    ]

    response = _client.chat.completions.create(
        model=NVIDIA_MODEL,
        messages=messages,
        temperature=0.2,
        top_p=0.9,
        max_tokens=1024,
    )

    answer = response.choices[0].message.content.strip()
    citations = build_citations(context_chunks)
    return answer, citations
