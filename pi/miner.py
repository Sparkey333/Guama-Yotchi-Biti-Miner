#!/usr/bin/env python3
"""Guama-Yotchi-Biti-Miner Pi / PC client.

Posts telemetry to the web app every interval. In real mode also connects to
a Stratum pool and submits SHA-256 attempts. Real CPU mining is intentionally
slow — this is for the lulz, demos and Tamagotchi gamification.
"""
from __future__ import annotations

import json
import os
import random
import sys
import time
from pathlib import Path

import requests

try:
    from stratum import StratumClient  # type: ignore
except Exception:  # pragma: no cover - stratum is optional
    StratumClient = None  # type: ignore


def load_config() -> dict:
    here = Path(__file__).parent
    cfg_path = here / "config.json"
    if not cfg_path.exists():
        cfg_path = here / "config.example.json"
    with cfg_path.open() as f:
        return json.load(f)


def post_telemetry(cfg: dict, hashrate_ghs: float, watts: float, accepted: int, rejected: int) -> dict | None:
    url = cfg["base_url"].rstrip("/") + "/api/miner/telemetry"
    payload = {
        "deviceId": cfg["device_id"],
        "label": cfg["label"],
        "kind": cfg["kind"],
        "hashrateGhs": round(hashrate_ghs, 4),
        "powerWatts": round(watts, 2),
        "sharesAccepted": accepted,
        "sharesRejected": rejected,
    }
    try:
        r = requests.post(url, json=payload, timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:  # pragma: no cover
        print(f"[telemetry] post failed: {e}", file=sys.stderr)
        return None


def estimate_pi_power(threads: int) -> float:
    # rough: Pi 5 idles ~3W, ~1.2W per busy core
    return 3.0 + threads * 1.2


def run_demo_loop(cfg: dict) -> None:
    accepted = 0
    rejected = 0
    print(f"[guama-yotchi] DEMO mode — posting to {cfg['base_url']} every {cfg['interval_sec']}s")
    while True:
        # demo hashrate jitter around 0.7 GH/s (cosmetic only)
        hashrate = max(0.05, 0.7 + random.uniform(-0.15, 0.2))
        watts = estimate_pi_power(cfg.get("threads", 1))
        if random.random() < 0.6:
            accepted += 1
        if random.random() < 0.05:
            rejected += 1
        ack = post_telemetry(cfg, hashrate, watts, accepted, rejected)
        if ack:
            print(f"[telemetry] ok  hr={hashrate:.2f}GH/s  w={watts:.1f}  profile={ack.get('profile')}")
        time.sleep(cfg["interval_sec"])


def run_real_loop(cfg: dict) -> None:
    if StratumClient is None:
        print("[guama-yotchi] stratum.py missing, falling back to demo", file=sys.stderr)
        return run_demo_loop(cfg)
    pool = cfg["pool"]
    wallet = cfg.get("wallet") or "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    worker = cfg.get("worker", "guama-yotchi")
    print(f"[guama-yotchi] REAL mode — pool={pool} worker={worker}")
    client = StratumClient(pool, wallet, worker)
    client.connect()
    accepted = 0
    rejected = 0
    last_post = 0.0
    while True:
        result = client.work_for(seconds=cfg["interval_sec"])
        accepted += result.accepted
        rejected += result.rejected
        if time.time() - last_post >= cfg["interval_sec"]:
            ack = post_telemetry(
                cfg,
                result.hashrate_ghs,
                estimate_pi_power(cfg.get("threads", 1)),
                accepted,
                rejected,
            )
            if ack:
                print(
                    f"[telemetry] ok  hr={result.hashrate_ghs:.4f}GH/s  shares={accepted}/{rejected}  profile={ack.get('profile')}"
                )
            last_post = time.time()


def main() -> int:
    cfg = load_config()
    mode = os.environ.get("GUAMA_MODE", cfg.get("mode", "demo"))
    if mode == "real":
        run_real_loop(cfg)
    else:
        run_demo_loop(cfg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
