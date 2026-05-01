#!/usr/bin/env python3
"""Solar / battery-aware power profile switcher for Goal Zero & friends.

Reads a battery percent from `solar.battery_file` in config.json
(every line should be a single integer 0..100), and posts to the web app's
PUT /api/miner/profile endpoint to throttle.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import requests


def load_config() -> dict:
    here = Path(__file__).parent
    cfg_path = here / "config.json"
    if not cfg_path.exists():
        cfg_path = here / "config.example.json"
    with cfg_path.open() as f:
        return json.load(f)


def read_battery(path: str) -> int | None:
    p = Path(path)
    if not p.exists():
        return None
    try:
        return max(0, min(100, int(p.read_text().strip())))
    except Exception:
        return None


def set_profile(base_url: str, profile: str, battery_pct: int | None) -> None:
    url = base_url.rstrip("/") + "/api/miner/profile"
    body = {"profile": profile}
    if battery_pct is not None:
        body["batteryPercent"] = battery_pct
    try:
        r = requests.put(url, json=body, timeout=5)
        r.raise_for_status()
        print(f"[solar] -> {profile} (battery={battery_pct}%) ok")
    except Exception as e:
        print(f"[solar] failed: {e}", file=sys.stderr)


def main() -> int:
    cfg = load_config()
    s = cfg.get("solar", {})
    if not s.get("enabled"):
        print("[solar] disabled in config")
        return 0
    base = cfg["base_url"]
    low = s.get("low_pct", 25)
    high = s.get("high_pct", 60)
    bf = s.get("battery_file", "/tmp/battery.txt")
    last = None
    while True:
        pct = read_battery(bf)
        if pct is None:
            print(f"[solar] no battery reading at {bf}, retrying")
            time.sleep(30)
            continue
        if pct < low:
            profile = "eco"
        elif pct > high:
            profile = "turbo"
        else:
            profile = "solar"
        if profile != last:
            set_profile(base, profile, pct)
            last = profile
        time.sleep(30)
    return 0


if __name__ == "__main__":
    sys.exit(main())
