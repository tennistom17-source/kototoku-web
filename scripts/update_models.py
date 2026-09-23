#!/usr/bin/env python3
"""Safely check curated official sources; never infer model names, prices, or scores."""
from __future__ import annotations
import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MODELS_PATH = ROOT / "data" / "models.json"
LOG_PATH = ROOT / "data" / "update-log.json"
USER_AGENT = "KototokuModelDataChecker/1.0 (+https://tennistom17-source.github.io/kototoku-web/)"

def fetch(url: str) -> tuple[bool, str]:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/json"})
    try:
        with urlopen(request, timeout=25) as response:
            if response.status != 200:
                return False, f"HTTP {response.status}"
            body = response.read(2_000_000)
            return True, hashlib.sha256(body).hexdigest()
    except (HTTPError, URLError, TimeoutError) as error:
        return False, f"{type(error).__name__}: {error}"

def main() -> int:
    payload = json.loads(MODELS_PATH.read_text(encoding="utf-8"))
    checked_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    entries = []
    for model in payload["models"]:
        success, detail = fetch(model["source_url"])
        entries.append({"id": model["id"], "source_url": model["source_url"], "checked_at": checked_at, "success": success, "result": detail})
    # No generic HTML scraper can safely infer changing names, pricing, or availability.
    # Leave models.json untouched unless a provider-specific verified parser is added and tested.
    LOG_PATH.write_text(json.dumps({"checked_at": checked_at, "entries": entries}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    failures = sum(not entry["success"] for entry in entries)
    print(f"Checked {len(entries)} official sources; {failures} retrieval failures; models.json unchanged.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
