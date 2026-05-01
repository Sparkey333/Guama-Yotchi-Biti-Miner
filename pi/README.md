# Guama-Yotchi-Biti-Miner — Raspberry Pi / PC client

This folder is a tiny Python miner client that posts telemetry to your
Guama-Yotchi-Biti-Miner web app and (optionally) connects to a real Stratum
pool. It also includes a Goal Zero / battery-aware solar throttler.

It runs on:

- Raspberry Pi 4 / 5 (headless, systemd)
- Any Linux/macOS/Windows PC (`python miner.py`)
- Side-by-side with an ESP32 flashed with NMMiner — they all post to the same
  web app and the buddy aggregates them.

> **Warning:** Real CPU SHA-256 mining on a Pi or PC will lose money. Use real
> mode for the lulz. Demo mode is the default.

---

## 1. Install

```bash
git clone https://github.com/<you>/Guama-Yotchi-Biti-Miner
cd Guama-Yotchi-Biti-Miner/pi
pip install -r requirements.txt
```

## 2. Configure

```bash
cp config.example.json config.json
# edit config.json: set base_url to your deployed app, e.g.
# "base_url": "https://guama-yotchi.replit.app"
```

If you want REAL mining, also set `mode: "real"`, plus `wallet`, `pool` and
`worker`.

## 3. Run once (PC mode)

```bash
python miner.py
```

You should see the buddy in the web app pick up a new device named
`pi-deck` (or whatever you set) and start streaming hashrate.

## 4. Run on boot (Pi headless)

```bash
sudo cp guama-yotchi.service /etc/systemd/system/
sudo systemctl enable --now guama-yotchi.service
journalctl -u guama-yotchi -f
```

## 5. Solar / Goal Zero mode

If you have a Goal Zero Yeti or any battery, run the solar helper alongside
the miner. It reads battery percent (from a config file you keep updated, or
a USB serial readout) and tells the web app's power-profile endpoint to
throttle when battery dips below thresholds.

```bash
python solar.py
```

Config keys in `config.json`:

```json
{
  "solar": {
    "enabled": true,
    "battery_file": "/tmp/battery.txt",
    "low_pct": 25,
    "high_pct": 60
  }
}
```

Below `low_pct` → switches to `eco`. Above `high_pct` → switches to `turbo`.
Otherwise → `solar` profile with the current battery %.

---

## Files

- `miner.py` — telemetry loop + optional Stratum client
- `solar.py` — battery-aware power-profile switcher
- `stratum.py` — minimal Stratum v1 client (subscribe/authorize/share)
- `config.example.json` — copy to `config.json`
- `requirements.txt`
- `guama-yotchi.service` — systemd unit
