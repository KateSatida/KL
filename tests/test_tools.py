"""Run with:  pip install pytest && pytest"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

import build_manifest  # noqa: E402


def test_label():
    assert build_manifest.label("02_pink_gown") == "Pink Gown"
    assert build_manifest.label("top-hat") == "Top Hat"


def test_manifest_lists_existing_files():
    m = build_manifest.build()
    for items in [*m["layers"].values(), m["frames"]]:
        for item in items:
            assert (ROOT / item["url"]).is_file()
            assert not item["url"].startswith("/"), "paths must be relative for GitHub Pages"
    assert m["layers"]["characters"], "need at least one character"


def test_config_is_valid_json_with_relative_paths():
    cfg = json.loads((ROOT / "config" / "game.json").read_text("utf-8"))
    ids = [s["id"] for s in cfg["stations"]]
    assert len(ids) == len(set(ids))
    assert '"/assets' not in json.dumps(cfg)
