import os
import sys
import time
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 768  


def _normalize(vector: list[float]) -> list[float]:
    """L2-normalize an embedding vector.
    
    At 768/1536 dims, gemini-embedding-001 does NOT return pre-normalized vectors.
    Skipping this silently degrades cosine similarity quality.
    """
    arr = np.array(vector, dtype=np.float64)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return vector
    return (arr / norm).tolist()


def _format_fic_text(summary: str | None, tags: list[str], fandom: str | None = None) -> str:
    """Format fic metadata for embedding: Tags → Fandom → Summary.
    
    Tags go first because:
    - Transformers give disproportionate attention to early tokens
    - Gemini truncates at 2048 tokens; tags are the primary matching signal
    - Comma-separated with label reads as natural language (better than JSON)
    """
    parts = []
    if tags:
        parts.append(f"Tags: {', '.join(tags)}")
    if fandom:
        parts.append(f"Fandom: {fandom}")
    if summary:
        parts.append(f"Summary: {summary}")
    return "\n".join(parts)


def embed_fic(title: str, summary: str, tags: list[str], fandom: str = None) -> list[float]:
    """Generate an embedding for a single fic using RETRIEVAL_DOCUMENT task type.
    
    The title is passed via the dedicated `title` parameter (not in content string)
    so the model gets a structured signal about the document.
    """
    text = _format_fic_text(summary, tags, fandom)
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=EMBEDDING_DIMS,
            title=title,
        )
    )
    return _normalize(result.embeddings[0].values)


def embed_query(query: str) -> list[float]:
    """Generate an embedding for a user search query using RETRIEVAL_QUERY task type."""
    print(f"[embedder] sending to Gemini ({EMBEDDING_MODEL}): {query!r}", flush=True)
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=query,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=EMBEDDING_DIMS,
        )
    )
    return _normalize(result.embeddings[0].values)


def embed_fics_batch(fics: list, fandom: str = None, batch_size: int = 25) -> list[list[float]]:
    """Embed a list of fics in batches using RETRIEVAL_DOCUMENT task type.
    
    Note: The batch API doesn't support per-item title params, so we bake the
    title into the content string for batch calls as a pragmatic tradeoff.
    Single-fic calls via embed_fic() use the proper title parameter.
    """
    texts = [
        f"Title: {fic.title}\n{_format_fic_text(fic.summary, fic.tags, fandom)}"
        for fic in fics
    ]

    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=EMBEDDING_DIMS,
            )
        )
        normalized = [_normalize(e.values) for e in result.embeddings]
        all_embeddings.extend(normalized)
        print(f"  Embedded batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
        if i + batch_size < len(texts):
            time.sleep(1)

    return all_embeddings


if __name__ == "__main__":
    vec = embed_query("enemies to lovers slow burn")
    print(f"Embedding generated: {len(vec)} dimensions")
    print(f"First 5 values: {vec[:5]}")
    print(f"L2 norm: {np.linalg.norm(vec):.6f}")  # should be ~1.0