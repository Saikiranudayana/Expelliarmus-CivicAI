from typing import List, Dict
import tiktoken

# cl100k_base is the tokeniser used by text-embedding-3-* and GPT-4 family;
# it gives the best token-count accuracy when targeting NVIDIA NIM embedding models.
_ENCODING_NAME = "cl100k_base"


def chunk_text(
    text: str,
    source: str,
    chunk_size: int = 512,
    chunk_overlap: int = 50,
) -> List[Dict]:
    """
    Split *text* into overlapping token windows.

    Parameters
    ----------
    text          : raw document text
    source        : filename / identifier stored alongside each chunk
    chunk_size    : maximum number of tokens per chunk (default 512)
    chunk_overlap : number of tokens shared between consecutive chunks (default 50)

    Returns
    -------
    List of dicts:
        {
            "text":        decoded chunk text (str),
            "source":      source identifier (str),
            "chunk_index": 0-based position within the document (int),
            "token_count": actual token count for this chunk (int),
        }
    """
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size.")

    encoder = tiktoken.get_encoding(_ENCODING_NAME)
    tokens: List[int] = encoder.encode(text)

    stride = chunk_size - chunk_overlap
    chunks: List[Dict] = []
    chunk_index = 0
    start = 0

    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]

        chunks.append(
            {
                "text": encoder.decode(chunk_tokens),
                "source": source,
                "chunk_index": chunk_index,
                "token_count": len(chunk_tokens),
            }
        )

        if end == len(tokens):
            break

        start += stride
        chunk_index += 1

    return chunks
