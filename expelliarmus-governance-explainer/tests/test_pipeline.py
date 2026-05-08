"""
Basic smoke tests for Expelliarmus.
Run with: pytest tests/
"""
import pytest
from ai_pipeline.chunking import chunk_text
from ai_pipeline.citation_engine import build_citations


def test_chunk_text_basic():
    text = " ".join([f"word{i}" for i in range(100)])
    chunks = chunk_text(text, source="test.pdf")
    assert len(chunks) > 0
    assert all("text" in c for c in chunks)
    assert all("source" in c for c in chunks)
    assert chunks[0]["source"] == "test.pdf"


def test_chunk_text_overlap():
    text = " ".join([f"word{i}" for i in range(200)])
    chunks = chunk_text(text, source="test.pdf")
    assert len(chunks) >= 1


def test_chunk_text_empty():
    chunks = chunk_text("", source="empty.pdf")
    assert chunks == []


def test_build_citations_dedup():
    chunks = [
        {"source": "doc.pdf", "chunk_index": 0},
        {"source": "doc.pdf", "chunk_index": 0},  # duplicate
        {"source": "doc.pdf", "chunk_index": 1},
    ]
    citations = build_citations(chunks)
    assert len(citations) == 2


def test_build_citations_format():
    chunks = [{"source": "minutes.pdf", "chunk_index": 3}]
    citations = build_citations(chunks)
    assert "minutes.pdf" in citations[0]
    assert "3" in citations[0]
