"""Shared helpers for parsing LLM JSON responses."""


def strip_fences(raw: str) -> str:
    """Strip a leading ```json / ``` markdown code fence from LLM output.

    Bedrock models occasionally wrap JSON in ```json ... ``` (or a bare ```)
    despite being told not to. Returns the inner text; a no-op when there's
    no fence.
    """
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        raw = raw.removeprefix("json").strip()
    return raw
