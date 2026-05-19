from pydantic import BaseModel
from typing import Optional

class Fic(BaseModel):
    title: str
    url: str
    platform: str
    fandom: Optional[str] = None
    summary: Optional[str] = None
    tags: list[str] = []
    word_count: Optional[int] = None
    kudos: Optional[int] = None
    hits: Optional[int] = None
    match_score: Optional[int] = None     
    match_reason: Optional[str] = None     