"""Bronze: raw upstream payloads, verbatim, never overwritten.

The one rule: nothing in this layer is ever edited or deleted. If the parser
is wrong you fix the parser and rebuild silver from bronze — you do not
re-fetch, because the old page is gone and with it any chance of proving what
upstream actually said. Snapshots are content-addressed, so a day where
nothing changed costs one line in the manifest and zero bytes of payload.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True, slots=True)
class Snapshot:
    indicator: str
    snapshot_id: str
    fetched_at: dt.datetime
    payload: Any
    is_new: bool  # False => byte-identical content already on disk


def _canonical(payload: Any) -> bytes:
    return json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str).encode()


class BronzeStore:
    def __init__(self, root: Path | str = "data/bronze") -> None:
        self.root = Path(root)

    def _blob_path(self, indicator: str, snapshot_id: str) -> Path:
        # Content-addressed, so identical payloads collapse onto one file.
        return self.root / indicator / "blobs" / f"{snapshot_id[:16]}.json"

    def _manifest_path(self, indicator: str) -> Path:
        return self.root / indicator / "_manifest.jsonl"

    def write(
        self, indicator: str, payload: Any, *, fetched_at: dt.datetime, source: str
    ) -> Snapshot:
        body = _canonical(payload)
        snapshot_id = hashlib.sha256(body).hexdigest()

        blob = self._blob_path(indicator, snapshot_id)
        is_new = not blob.exists()
        if is_new:
            blob.parent.mkdir(parents=True, exist_ok=True)
            blob.write_bytes(body)

        manifest = self._manifest_path(indicator)
        manifest.parent.mkdir(parents=True, exist_ok=True)
        with manifest.open("a", encoding="utf-8") as fh:
            fh.write(
                json.dumps(
                    {
                        "fetched_at": fetched_at.isoformat(),
                        "snapshot_id": snapshot_id,
                        "source": source,
                        "bytes": len(body),
                        "new_content": is_new,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )

        return Snapshot(indicator, snapshot_id, fetched_at, payload, is_new)

    def read(self, indicator: str, snapshot_id: str) -> Any:
        return json.loads(self._blob_path(indicator, snapshot_id).read_text("utf-8"))

    def history(self, indicator: str) -> list[dict[str, Any]]:
        path = self._manifest_path(indicator)
        if not path.exists():
            return []
        return [json.loads(line) for line in path.read_text("utf-8").splitlines() if line]
