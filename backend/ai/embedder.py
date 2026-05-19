import logging
import os
import sys
import time
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google import genai
from google.genai import types
from google.genai import errors as genai_errors
import config
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

logger = logging.getLogger(__name__)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 768  


def _is_rate_limit(exc: BaseException) -> bool:
    """Return True only for Gemini 429 / ResourceExhausted errors."""
    if not isinstance(exc, genai_errors.ClientError):
        return False
    code = getattr(exc, 'status_code', None) or getattr(exc, 'code', None)
    if code == 429:
        return True
    text = str(exc).lower()
    return 'resourceexhausted' in text or '429' in text


@retry(
    retry=retry_if_exception(_is_rate_limit),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(5),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def _embed_single(contents, task_type: str, title: str = None):
    """Single embed_content call with up to 5 retries on rate-limit errors."""
    kwargs = dict(task_type=task_type, output_dimensionality=EMBEDDING_DIMS)
    if title is not None:
        kwargs['title'] = title
    return client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=contents,
        config=types.EmbedContentConfig(**kwargs),
    )


@retry(
    retry=retry_if_exception(_is_rate_limit),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(5),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def _embed_batch(batch: list[str]):
    """Batch embed_content call with up to 5 retries on rate-limit errors."""
    return client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=batch,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=EMBEDDING_DIMS,
        ),
    )


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
    """Format fic metadata for embedding: Summary → Fandom → Tags.

    Summary leads because it's the one signal every platform has in comparable
    richness. FFN has a much thinner tagging culture than AO3 (avg ~15 chars of
    tags vs AO3's ~630), so tag-first ordering was systematically under-weighting
    FFN fics. Summary-first normalizes the embedding signal across platforms.
    """
    parts = []
    if summary:
        parts.append(f"Summary: {summary}")
    if fandom:
        parts.append(f"Fandom: {fandom}")
    if tags:
        parts.append(f"Tags: {', '.join(tags)}")
    return "\n".join(parts)


def embed_fic(title: str, summary: str, tags: list[str], fandom: str = None) -> list[float]:
    """Generate an embedding for a single fic using RETRIEVAL_DOCUMENT task type.
    
    The title is passed via the dedicated `title` parameter (not in content string)
    so the model gets a structured signal about the document.
    """
    text = _format_fic_text(summary, tags, fandom)
    result = _embed_single(text, task_type="RETRIEVAL_DOCUMENT", title=title)
    return _normalize(result.embeddings[0].values)


def embed_query(query: str) -> list[float]:
    """Generate an embedding for a user search query using RETRIEVAL_QUERY task type."""
    print(f"[embedder] sending to Gemini ({EMBEDDING_MODEL}): {query!r}", flush=True)
    result = _embed_single(query, task_type="RETRIEVAL_QUERY")
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
        result = _embed_batch(batch)
        normalized = [_normalize(e.values) for e in result.embeddings]
        all_embeddings.extend(normalized)
        print(f"  Embedded batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")

    return all_embeddings


if __name__ == "__main__":
    vec = embed_query("enemies to lovers slow burn")
    print(f"Embedding generated: {len(vec)} dimensions")
    print(f"First 5 values: {vec[:5]}")
    print(f"L2 norm: {np.linalg.norm(vec):.6f}")  # should be ~1.0