import { db } from "@workspace/db";
import {
  minerConfigTable,
  telemetryTable,
  devicesTable,
  achievementsTable,
  missionsTable,
  type MinerConfigRow,
} from "@workspace/db";
import { eq, gte, desc } from "drizzle-orm";

type Mood = "happy" | "hyped" | "sleepy" | "sad" | "hungry" | "sick" | "offline";
type Profile = "eco" | "balanced" | "turbo" | "solar";

type Profiles = Record<Profile, { hashGhs: number; watts: number }>;
const PROFILES: Profiles = {
  eco: { hashGhs: 0.6, watts: 5 },
  balanced: { hashGhs: 1.4, watts: 12 },
  turbo: { hashGhs: 3.2, watts: 28 },
  solar: { hashGhs: 1.1, watts: 9 },
};

const STARTED_AT = Date.now();

let overclockState = {
  active: false,
  multiplier: 1,
  heat: 0,
  cooldownUntil: 0,
};

let recentClicks: number[] = [];
let lastBtcPrice = 102_345;
let lastBtcChange = 1.42;

function tickClicksWindow(now: number) {
  recentClicks = recentClicks.filter((t) => now - t < 1500);
}

export async function ensureSeed() {
  const existing = await db.select().from(minerConfigTable).limit(1);
  if (existing.length === 0) {
    await db.insert(minerConfigTable).values({});
  }
  const devs = await db.select().from(devicesTable);
  if (devs.length === 0) {
    await db.insert(devicesTable).values([
      { id: "sim-buddy", label: "GUAMA SIM", kind: "sim", lastHashrateGhs: 1.4, lastPowerWatts: 12 },
      { id: "pi-deck", label: "PI 5 DECK", kind: "pi", lastHashrateGhs: 0.7, lastPowerWatts: 6 },
    ]);
  }
  const achs = await db.select().from(achievementsTable);
  if (achs.length === 0) {
    await db.insert(achievementsTable).values([
      { id: "first-share", name: "FIRST BLOOD", description: "Submit your first share.", sticker: "FIRST", progress: 1, earnedAt: new Date() },
      { id: "overclocker", name: "OVERCLOCKER", description: "Trigger overclock 10 times.", sticker: "OC", progress: 0.4 },
      { id: "solar-saint", name: "SOLAR SAINT", description: "Mine 24h on Solar profile.", sticker: "SUN", progress: 0.2 },
      { id: "streak-7", name: "WEEK STREAK", description: "Mine every day for a week.", sticker: "X7", progress: 0.55 },
      { id: "kilohash", name: "KILOHASH KID", description: "Hit 1 GH/s sustained.", sticker: "1K", progress: 1, earnedAt: new Date() },
      { id: "buddy-best", name: "BEST BUDS", description: "Reach buddy level 10.", sticker: "BUD", progress: 0.3 },
    ]);
  }
  const ms = await db.select().from(missionsTable);
  if (ms.length === 0) {
    await db.insert(missionsTable).values([
      { id: "feed-3", title: "FEED THE BUDDY 3X", target: 3, current: 1, unit: "feeds", rewardXp: 50 },
      { id: "shares-100", title: "100 ACCEPTED SHARES", target: 100, current: 41, unit: "shares", rewardXp: 120 },
      { id: "overclock-2", title: "OVERCLOCK TWICE", target: 2, current: 0, unit: "OCs", rewardXp: 80 },
      { id: "solar-1h", title: "1H ON SOLAR", target: 60, current: 12, unit: "min", rewardXp: 60 },
    ]);
  }
  // backfill 60 minutes telemetry if empty
  const t = await db.select().from(telemetryTable).limit(1);
  if (t.length === 0) {
    const now = Date.now();
    const rows = [];
    for (let i = 60; i >= 0; i--) {
      const at = new Date(now - i * 60_000);
      const wave = Math.sin(i / 6) * 0.3 + 1;
      const noise = (Math.random() - 0.5) * 0.2;
      const hr = Math.max(0.2, 1.4 * wave + noise);
      const w = 12 * wave + Math.random();
      rows.push({
        deviceId: "sim-buddy",
        label: "GUAMA SIM",
        kind: "sim",
        hashrateGhs: hr,
        powerWatts: w,
        earningsUsd: hr * 0.0008,
        sharesAccepted: Math.floor(hr * 4),
        sharesRejected: Math.random() < 0.1 ? 1 : 0,
        recordedAt: at,
      });
    }
    await db.insert(telemetryTable).values(rows);
  }
}

export async function getConfigRow(): Promise<MinerConfigRow> {
  const rows = await db.select().from(minerConfigTable).limit(1);
  return rows[0]!;
}

export async function updateConfigRow(patch: Partial<MinerConfigRow>) {
  const cfg = await getConfigRow();
  const [updated] = await db
    .update(minerConfigTable)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(minerConfigTable.id, cfg.id))
    .returning();
  return updated!;
}

function moodFor(cfg: MinerConfigRow, hashRatio: number): Mood {
  if (!cfg.running) return "offline";
  if (cfg.buddyHunger > 80) return "hungry";
  if (overclockState.heat > 80) return "sick";
  if (overclockState.active) return "hyped";
  if (hashRatio > 1.0) return "happy";
  if (hashRatio < 0.4) return "sleepy";
  return "happy";
}

export async function tickStatus() {
  const cfg = await getConfigRow();
  const now = Date.now();
  tickClicksWindow(now);

  if (overclockState.active && now > overclockState.cooldownUntil) {
    overclockState = { active: false, multiplier: 1, heat: Math.max(0, overclockState.heat - 10), cooldownUntil: 0 };
  } else if (overclockState.active) {
    overclockState.heat = Math.min(100, overclockState.heat + 0.4);
  } else {
    overclockState.heat = Math.max(0, overclockState.heat - 0.6);
  }

  const profileKey = cfg.profile as Profile;
  let { hashGhs, watts } = PROFILES[profileKey] ?? PROFILES.balanced;
  if (profileKey === "solar") {
    const factor = Math.max(0.1, cfg.batteryPercent / 100);
    hashGhs *= factor;
    watts *= factor;
  }
  if (overclockState.active) {
    hashGhs *= overclockState.multiplier;
    watts *= overclockState.multiplier * 1.15;
  }
  if (!cfg.running) {
    hashGhs = 0;
    watts = 0;
  }

  // hunger drift
  const newHunger = Math.min(100, cfg.buddyHunger + 0.05);
  const newXp = cfg.buddyXp + (cfg.running ? hashGhs * 0.01 : 0);
  const newLevel = Math.max(cfg.buddyLevel, Math.floor(newXp / 50) + 1);
  if (newHunger !== cfg.buddyHunger || newXp !== cfg.buddyXp || newLevel !== cfg.buddyLevel) {
    await db
      .update(minerConfigTable)
      .set({ buddyHunger: newHunger, buddyXp: newXp, buddyLevel: newLevel })
      .where(eq(minerConfigTable.id, cfg.id));
    cfg.buddyHunger = newHunger;
    cfg.buddyXp = newXp;
    cfg.buddyLevel = newLevel;
  }

  const dailyKwh = (watts * 24) / 1000;
  const dailyCost = dailyKwh * cfg.electricityCostKwh;
  const dailyRevenue = hashGhs * 0.0008 * 24; // demo
  const estDailyUsd = dailyRevenue - dailyCost;
  const estMonthlyUsd = estDailyUsd * 30;
  const profitPerWatt = watts > 0 ? estDailyUsd / watts : 0;

  const ratio = hashGhs / (PROFILES.balanced.hashGhs || 1);
  const mood = moodFor(cfg, ratio);

  const status = {
    running: cfg.running,
    mode: cfg.mode as "demo" | "real",
    profile: cfg.profile as Profile,
    mood,
    buddyName: cfg.buddyName,
    buddyLevel: cfg.buddyLevel,
    buddyXp: Number(cfg.buddyXp.toFixed(2)),
    buddyHunger: Number(cfg.buddyHunger.toFixed(1)),
    hashrateGhs: Number(hashGhs.toFixed(3)),
    powerWatts: Number(watts.toFixed(2)),
    profitPerWatt: Number(profitPerWatt.toFixed(5)),
    estDailyUsd: Number(estDailyUsd.toFixed(3)),
    estMonthlyUsd: Number(estMonthlyUsd.toFixed(2)),
    sharesAccepted: Math.floor(((now - STARTED_AT) / 1000) * 0.05 * (hashGhs || 0.1)),
    sharesRejected: Math.floor(((now - STARTED_AT) / 1000) * 0.002 * (hashGhs || 0.1)),
    bestDifficulty: Number((123_456 + (cfg.buddyXp * 13)).toFixed(0)),
    workers: cfg.pcMinerEnabled ? 2 : 1,
    uptimeSec: Math.floor((now - STARTED_AT) / 1000),
    ipAddress: "10.0.0." + (40 + (cfg.id % 200)),
    overclockActive: overclockState.active,
    overclockMultiplier: Number(overclockState.multiplier.toFixed(2)),
    overclockHeat: Number(overclockState.heat.toFixed(1)),
    overclockCooldownSec: Math.max(0, Math.ceil((overclockState.cooldownUntil - now) / 1000)),
    batteryPercent: cfg.batteryPercent,
    streakDays: cfg.streakDays,
    btcPriceUsd: lastBtcPrice,
    timestamp: new Date().toISOString(),
  };
  return status;
}

export function registerOverclockClicks(clicks: number) {
  const now = Date.now();
  if (now < overclockState.cooldownUntil && overclockState.active) {
    return { accepted: false, multiplier: overclockState.multiplier, heat: overclockState.heat, cooldownSec: Math.ceil((overclockState.cooldownUntil - now) / 1000), reason: "Already overclocking" };
  }
  if (overclockState.heat > 90) {
    return { accepted: false, multiplier: 1, heat: overclockState.heat, cooldownSec: 0, reason: "TOO HOT! Let it cool." };
  }
  for (let i = 0; i < clicks; i++) recentClicks.push(now);
  tickClicksWindow(now);
  const cps = recentClicks.length;
  if (cps < 6) {
    return { accepted: false, multiplier: 1, heat: overclockState.heat, cooldownSec: 0, reason: "Click faster, poser." };
  }
  const mult = Math.min(3.5, 1 + cps / 12);
  overclockState = {
    active: true,
    multiplier: mult,
    heat: Math.min(100, overclockState.heat + cps * 1.2),
    cooldownUntil: now + 8000,
  };
  return { accepted: true, multiplier: Number(mult.toFixed(2)), heat: Number(overclockState.heat.toFixed(1)), cooldownSec: 8 };
}

export async function recordTelemetry(p: {
  deviceId: string;
  label: string;
  kind: string;
  hashrateGhs: number;
  powerWatts: number;
  sharesAccepted: number;
  sharesRejected: number;
}) {
  const cfg = await getConfigRow();
  await db.insert(telemetryTable).values({
    deviceId: p.deviceId,
    label: p.label,
    kind: p.kind,
    hashrateGhs: p.hashrateGhs,
    powerWatts: p.powerWatts,
    earningsUsd: p.hashrateGhs * 0.0008,
    sharesAccepted: p.sharesAccepted,
    sharesRejected: p.sharesRejected,
  });
  await db
    .insert(devicesTable)
    .values({
      id: p.deviceId,
      label: p.label,
      kind: p.kind,
      online: true,
      lastHashrateGhs: p.hashrateGhs,
      lastPowerWatts: p.powerWatts,
      lastSeen: new Date(),
    })
    .onConflictDoUpdate({
      target: devicesTable.id,
      set: {
        label: p.label,
        kind: p.kind,
        online: true,
        lastHashrateGhs: p.hashrateGhs,
        lastPowerWatts: p.powerWatts,
        lastSeen: new Date(),
      },
    });
  return { profile: cfg.profile as Profile, suggestedHashrateGhs: PROFILES[(cfg.profile as Profile)].hashGhs };
}

export async function getHistory(minutes: number) {
  const since = new Date(Date.now() - minutes * 60_000);
  const rows = await db
    .select()
    .from(telemetryTable)
    .where(gte(telemetryTable.recordedAt, since))
    .orderBy(desc(telemetryTable.recordedAt))
    .limit(2000);
  return rows
    .map((r) => ({
      t: r.recordedAt.toISOString(),
      hashrateGhs: r.hashrateGhs,
      powerWatts: r.powerWatts,
      earningsUsd: r.earningsUsd,
      sharesAccepted: r.sharesAccepted,
      sharesRejected: r.sharesRejected,
      deviceId: r.deviceId,
    }))
    .reverse();
}

export async function getHeatmap() {
  const cfg = await getConfigRow();
  const hours = Array.from({ length: 24 }, (_, h) => {
    // Off-peak hours (1-6am) cheaper
    const peak = h >= 17 && h <= 21;
    const cheap = h >= 1 && h <= 6;
    const tariff = peak ? cfg.electricityCostKwh * 1.6 : cheap ? cfg.electricityCostKwh * 0.5 : cfg.electricityCostKwh;
    const dailyKwh = (PROFILES.balanced.watts * 1) / 1000;
    const cost = dailyKwh * tariff;
    const priceWobble = Math.sin(h / 3.5) * 800 + (Math.random() - 0.5) * 200;
    const price = lastBtcPrice + priceWobble;
    const rev = PROFILES.balanced.hashGhs * 0.0008 * (price / lastBtcPrice);
    const net = rev - cost;
    return {
      hour: h,
      profitScore: Math.max(0, Math.min(100, 50 + net * 8000)),
      netUsd: Number(net.toFixed(4)),
      avgPriceUsd: Number(price.toFixed(0)),
      avgPowerCostUsd: Number(cost.toFixed(4)),
    };
  });
  const sorted = [...hours].sort((a, b) => b.profitScore - a.profitScore);
  return { hours, bestHour: sorted[0]!.hour, worstHour: sorted[sorted.length - 1]!.hour };
}

export function getBtcPrice() {
  // tiny random walk
  lastBtcPrice += (Math.random() - 0.5) * 80;
  lastBtcChange = Number(((Math.random() - 0.5) * 4).toFixed(2));
  return {
    usd: Number(lastBtcPrice.toFixed(2)),
    change24hPct: lastBtcChange,
    source: "demo-feed",
    timestamp: new Date().toISOString(),
  };
}

export async function applyFeed(action: "feed" | "pet" | "clean") {
  const cfg = await getConfigRow();
  const patch: Partial<MinerConfigRow> = {};
  if (action === "feed") patch.buddyHunger = Math.max(0, cfg.buddyHunger - 35);
  if (action === "pet") patch.buddyXp = cfg.buddyXp + 2;
  if (action === "clean") patch.buddyHunger = Math.max(0, cfg.buddyHunger - 10);
  await db.update(minerConfigTable).set(patch).where(eq(minerConfigTable.id, cfg.id));
}
