# data/vote_candidates.py
#
# Pool of popular fandoms NOT yet in the index, used by the free community vote
# (api.py /vote). The ballot shows 4 of these at random; the winner is what the
# operator indexes next. These are just display names — source mappings only get
# added to data/fandoms.py when a winner is actually indexed.
#
# Keep in sync loosely with data/fandoms.py: once a fandom here gets indexed,
# drop it from this list so it stops appearing on ballots.

VOTE_CANDIDATES = [
    # Anime / manga
    "Bleach",
    "Jujutsu Kaisen",
    "Demon Slayer",
    "Fairy Tail",
    "Fullmetal Alchemist",
    "Haikyuu!!",
    "Bungou Stray Dogs",
    "Tokyo Revengers",
    "Chainsaw Man",
    "One Punch Man",
    "Yu Yu Hakusho",
    "Sailor Moon",
    # Western TV / film
    "Marvel Cinematic Universe",
    "Batman",
    "Supernatural",
    "Sherlock (BBC)",
    "Star Wars",
    "The Witcher",
    "The Lord of the Rings",
    "Good Omens",
    "Our Flag Means Death",
    "Stranger Things",
    # Books
    "Twilight",
    "The Hunger Games",
    # Games
    "Fire Emblem",
    "Overwatch",
    "League of Legends",
    "Undertale",
]
