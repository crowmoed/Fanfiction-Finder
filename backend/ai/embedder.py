import os
import sys
import time
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
EMBEDDING_MODEL = "gemini-embedding-001"


def embed_text(text: str) -> list[float]:
    """Generate an embedding vector for a single string."""
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text
    )
    return result.embeddings[0].values


def embed_fic(title: str, summary: str, tags: list[str]) -> list[float]:
    """Generate an embedding for a fic from its metadata."""
    text = f"{title}. {summary or ''}. Tags: {', '.join(tags[:15])}"
    return embed_text(text)


def embed_query(query: str) -> list[float]:
    """Generate an embedding for a user search query."""
    return embed_text(query)


def embed_fics_batch(fics: list, batch_size: int = 25) -> list[list[float]]:
    """Embed a list of fics in batches. Returns list of embedding vectors."""
    texts = [
        f"{fic.title}. {fic.summary or ''}. Tags: {', '.join(fic.tags[:15])}"
        for fic in fics
    ]

    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch
        )
        all_embeddings.extend([e.values for e in result.embeddings])
        print(f"  Embedded batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
        if i + batch_size < len(texts):
            time.sleep(1)

    return all_embeddings


if __name__ == "__main__":
    vec = embed_query("enemies to lovers slow burn")
    print(f"Embedding generated: {len(vec)} dimensions")
    print(f"First 5 values: {vec[:5]}")