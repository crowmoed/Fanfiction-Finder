# main.py - quick test runner
import json
from scrapers import ao3, ffn
from ai.ranker import rank

def test_search(query: str, fandom: str, use_ffn: bool = True):
    print(f"\n{'='*50}")
    print(f"Query: {query}")
    print(f"Fandom: {fandom}")
    print(f"{'='*50}\n")

    print("--- AO3 ---")
    ao3_results = ao3.search(query=query, fandom=fandom, pages=1)
    print(f"AO3 returned {len(ao3_results)} results\n")

    ffn_results = []
    if use_ffn:
        print("--- FFN ---")
        ffn_results = ffn.search(fandom_name=fandom, pages=1)
        print(f"FFN returned {len(ffn_results)} results\n")

    combined = ao3_results + ffn_results
    print(f"Total combined: {len(combined)} results\n")

    print("--- AI Ranking ---")
    ranked = rank(fics=combined, query=query)

    print(f"\nTop 10 results for '{query}':\n")
    for i, fic in enumerate(ranked[:10], 1):
        print(f"{i}. [{fic.platform.upper()}] {fic.title}")
        print(f"   Score: {fic.match_score}/100 — {fic.match_reason}")
        print(f"   Kudos/Favs: {fic.kudos} | Words: {fic.word_count}")
        print(f"   URL: {fic.url}")
        print()


if __name__ == "__main__":
    test_search(
        query="enemies to lovers slow burn",
        fandom="Harry Potter",
        use_ffn=True
    )