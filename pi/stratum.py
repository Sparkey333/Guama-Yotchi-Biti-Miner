"""Minimal Stratum v1 client. CPU SHA-256 — slow on purpose. For demo / lulz."""
from __future__ import annotations

import hashlib
import json
import socket
import struct
import time
from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass
class WorkResult:
    accepted: int = 0
    rejected: int = 0
    hashrate_ghs: float = 0.0


class StratumClient:
    def __init__(self, url: str, wallet: str, worker: str):
        # Accept stratum+tcp://host:port
        u = urlparse(url.replace("stratum+tcp://", "tcp://"))
        self.host = u.hostname or "solo.ckpool.org"
        self.port = u.port or 3333
        self.wallet = wallet
        self.worker = worker
        self.sock: socket.socket | None = None
        self.msg_id = 1
        self.extranonce1 = ""
        self.extranonce2_size = 4
        self.job: dict | None = None

    def _send(self, payload: dict) -> dict:
        assert self.sock is not None
        payload["id"] = self.msg_id
        self.msg_id += 1
        self.sock.sendall((json.dumps(payload) + "\n").encode())
        buf = b""
        while not buf.endswith(b"\n"):
            chunk = self.sock.recv(4096)
            if not chunk:
                break
            buf += chunk
        return json.loads(buf.decode().splitlines()[0])

    def connect(self) -> None:
        self.sock = socket.create_connection((self.host, self.port), timeout=10)
        sub = self._send({"method": "mining.subscribe", "params": ["guama-yotchi/0.1"]})
        if isinstance(sub.get("result"), list):
            try:
                self.extranonce1 = sub["result"][1]
                self.extranonce2_size = int(sub["result"][2])
            except Exception:
                pass
        self._send({
            "method": "mining.authorize",
            "params": [f"{self.wallet}.{self.worker}", "x"],
        })

    def work_for(self, seconds: float) -> WorkResult:
        # CPU SHA-256d hashing burst. Not optimized — just a heartbeat.
        end = time.time() + seconds
        nonce = 0
        target = b"\x00\x00\xff\xff" + b"\xff" * 28  # very easy local target
        header = struct.pack("<I", int(time.time())) + self.extranonce1.encode() + b"GUAMA"
        hashes = 0
        accepted = 0
        while time.time() < end:
            nonce += 1
            hashes += 1
            h = hashlib.sha256(hashlib.sha256(header + struct.pack("<I", nonce)).digest()).digest()
            if h[::-1] < target:
                accepted += 1
        elapsed = max(0.001, seconds)
        # GH/s = hashes / 1e9 / sec
        return WorkResult(accepted=accepted, rejected=0, hashrate_ghs=hashes / 1e9 / elapsed)
