import { Router, type IRouter } from "express";
import {
  TriggerOverclockBody,
  FeedBuddyBody,
  SetPowerProfileBody,
  UpdateMinerConfigBody,
  GetMinerHistoryQueryParams,
  IngestTelemetryBody,
} from "@workspace/api-zod";
import { db, achievementsTable, missionsTable, devicesTable } from "@workspace/db";
import {
  ensureSeed,
  tickStatus,
  registerOverclockClicks,
  applyFeed,
  getConfigRow,
  updateConfigRow,
  getHistory,
  getHeatmap,
  getBtcPrice,
  recordTelemetry,
} from "../lib/minerEngine";

const router: IRouter = Router();

let seeded = false;
async function maybeSeed() {
  if (!seeded) {
    await ensureSeed();
    seeded = true;
  }
}

router.use(async (_req, _res, next) => {
  try {
    await maybeSeed();
    next();
  } catch (e) {
    next(e);
  }
});

router.get("/status", async (_req, res, next) => {
  try {
    res.json(await tickStatus());
  } catch (e) {
    next(e);
  }
});

router.post("/start", async (_req, res, next) => {
  try {
    await updateConfigRow({ running: true });
    res.json(await tickStatus());
  } catch (e) {
    next(e);
  }
});

router.post("/stop", async (_req, res, next) => {
  try {
    await updateConfigRow({ running: false });
    res.json(await tickStatus());
  } catch (e) {
    next(e);
  }
});

router.post("/overclock", (req, res, next) => {
  try {
    const body = TriggerOverclockBody.parse(req.body);
    res.json(registerOverclockClicks(body.clicks));
  } catch (e) {
    next(e);
  }
});

router.post("/feed", async (req, res, next) => {
  try {
    const body = FeedBuddyBody.parse(req.body);
    await applyFeed(body.action);
    res.json(await tickStatus());
  } catch (e) {
    next(e);
  }
});

router.get("/profile", async (_req, res, next) => {
  try {
    const cfg = await getConfigRow();
    const profileMap = {
      eco: { targetWatts: 5, targetHashrateGhs: 0.6 },
      balanced: { targetWatts: 12, targetHashrateGhs: 1.4 },
      turbo: { targetWatts: 28, targetHashrateGhs: 3.2 },
      solar: { targetWatts: 9, targetHashrateGhs: 1.1 },
    };
    const t = profileMap[cfg.profile as keyof typeof profileMap] ?? profileMap.balanced;
    res.json({
      profile: cfg.profile,
      targetWatts: t.targetWatts,
      targetHashrateGhs: t.targetHashrateGhs,
      batteryPercent: cfg.batteryPercent,
    });
  } catch (e) {
    next(e);
  }
});

router.put("/profile", async (req, res, next) => {
  try {
    const body = SetPowerProfileBody.parse(req.body);
    const patch: Record<string, unknown> = { profile: body.profile };
    if (body.batteryPercent != null) patch.batteryPercent = body.batteryPercent;
    await updateConfigRow(patch);
    const cfg = await getConfigRow();
    const profileMap = {
      eco: { targetWatts: 5, targetHashrateGhs: 0.6 },
      balanced: { targetWatts: 12, targetHashrateGhs: 1.4 },
      turbo: { targetWatts: 28, targetHashrateGhs: 3.2 },
      solar: { targetWatts: 9, targetHashrateGhs: 1.1 },
    };
    const t = profileMap[cfg.profile as keyof typeof profileMap] ?? profileMap.balanced;
    res.json({
      profile: cfg.profile,
      targetWatts: t.targetWatts,
      targetHashrateGhs: t.targetHashrateGhs,
      batteryPercent: cfg.batteryPercent,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/config", async (_req, res, next) => {
  try {
    const cfg = await getConfigRow();
    res.json({
      mode: cfg.mode,
      buddyName: cfg.buddyName,
      walletAddress: cfg.walletAddress,
      poolUrl: cfg.poolUrl,
      workerName: cfg.workerName,
      electricityCostKwh: cfg.electricityCostKwh,
      pcMinerEnabled: cfg.pcMinerEnabled,
    });
  } catch (e) {
    next(e);
  }
});

router.put("/config", async (req, res, next) => {
  try {
    const body = UpdateMinerConfigBody.parse(req.body);
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) if (v != null) patch[k] = v;
    await updateConfigRow(patch);
    const cfg = await getConfigRow();
    res.json({
      mode: cfg.mode,
      buddyName: cfg.buddyName,
      walletAddress: cfg.walletAddress,
      poolUrl: cfg.poolUrl,
      workerName: cfg.workerName,
      electricityCostKwh: cfg.electricityCostKwh,
      pcMinerEnabled: cfg.pcMinerEnabled,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const params = GetMinerHistoryQueryParams.parse(req.query);
    res.json(await getHistory(params.minutes ?? 60));
  } catch (e) {
    next(e);
  }
});

router.get("/heatmap", async (_req, res, next) => {
  try {
    res.json(await getHeatmap());
  } catch (e) {
    next(e);
  }
});

router.get("/achievements", async (_req, res, next) => {
  try {
    const rows = await db.select().from(achievementsTable);
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        sticker: r.sticker,
        earnedAt: r.earnedAt ? r.earnedAt.toISOString() : null,
        progress: r.progress,
      })),
    );
  } catch (e) {
    next(e);
  }
});

router.get("/missions", async (_req, res, next) => {
  try {
    const rows = await db.select().from(missionsTable);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.get("/price", (_req, res) => {
  res.json(getBtcPrice());
});

router.get("/devices", async (_req, res, next) => {
  try {
    const rows = await db.select().from(devicesTable);
    res.json(
      rows.map((r) => ({
        id: r.id,
        label: r.label,
        kind: r.kind,
        online: r.online,
        hashrateGhs: r.lastHashrateGhs,
        powerWatts: r.lastPowerWatts,
        lastSeen: r.lastSeen.toISOString(),
      })),
    );
  } catch (e) {
    next(e);
  }
});

router.post("/telemetry", async (req, res, next) => {
  try {
    const body = IngestTelemetryBody.parse(req.body);
    const ack = await recordTelemetry(body);
    res.json({ ok: true, ...ack });
  } catch (e) {
    next(e);
  }
});

export default router;
