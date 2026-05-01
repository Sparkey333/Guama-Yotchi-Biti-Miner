# Guama-Yotchi-Biti-Miner

A 90s sk8er-punk Tamagotchi-style Bitcoin miner. Half browser pet, half
overclocked rig. Runs in your browser, on a Raspberry Pi, on a PC, and plays
nice with a Goal Zero solar setup.

## What's in here

- `artifacts/miner` — React + Vite + Tailwind frontend (the web pet)
- `artifacts/api-server` — Express 5 API (status, telemetry, AI chat, etc.)
- `lib/db` — Drizzle + Postgres schema
- `lib/api-spec` — OpenAPI spec & Orval codegen
- `pi/` — Python client for Raspberry Pi / PC + systemd unit + Stratum +
  solar/Goal Zero throttler

## Features

- **Tamagotchi buddy** with moods (happy, hyped, sleepy, sad, hungry, sick),
  level, XP, hunger, streaks
- **Real or demo mining** — ships in demo mode by default; flip to real and
  point at a Stratum pool
- **Power profiles**: Eco, Balanced, Turbo, Solar (with battery % input for
  Goal Zero)
- **Rapid-click overclock pad** with heat gauge & cooldown
- **24h profit heatmap** (best/worst hours to mine)
- **Charts** for hashrate, power, earnings, shares
- **Achievements** sticker book + daily missions
- **AI buddy** — chat with Claude or GPT, toggle in the UI, with preset
  prompt chips for common setup ideas
- **Pi / PC client** — `pi/miner.py` posts telemetry + optional Stratum
  mining, `pi/solar.py` throttles based on battery %

## Run locally on Replit

The repo is a pnpm monorepo. Replit handles workflows for you. The web app
serves at `/` and the API at `/api`.

## Pi

See `pi/README.md`.

## License

MIT
