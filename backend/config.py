"""
Centralized env loader. Import this module to ensure the root .env is loaded.

Usage:
    import config  # loads .env from project root
"""

from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")
