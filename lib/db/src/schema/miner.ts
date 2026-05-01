import {
  pgTable,
  text,
  serial,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const minerConfigTable = pgTable("miner_config", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull().default("demo"),
  buddyName: text("buddy_name").notNull().default("RIPPER"),
  walletAddress: text("wallet_address"),
  poolUrl: text("pool_url").notNull().default("stratum+tcp://solo.ckpool.org:3333"),
  workerName: text("worker_name").notNull().default("guama-yotchi"),
  electricityCostKwh: doublePrecision("electricity_cost_kwh").notNull().default(0.12),
  pcMinerEnabled: boolean("pc_miner_enabled").notNull().default(false),
  profile: text("profile").notNull().default("balanced"),
  batteryPercent: doublePrecision("battery_percent").notNull().default(80),
  buddyLevel: integer("buddy_level").notNull().default(1),
  buddyXp: doublePrecision("buddy_xp").notNull().default(0),
  buddyHunger: doublePrecision("buddy_hunger").notNull().default(50),
  streakDays: integer("streak_days").notNull().default(0),
  running: boolean("running").notNull().default(true),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const telemetryTable = pgTable("telemetry", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  label: text("label").notNull(),
  kind: text("kind").notNull(),
  hashrateGhs: doublePrecision("hashrate_ghs").notNull(),
  powerWatts: doublePrecision("power_watts").notNull(),
  earningsUsd: doublePrecision("earnings_usd").notNull().default(0),
  sharesAccepted: integer("shares_accepted").notNull().default(0),
  sharesRejected: integer("shares_rejected").notNull().default(0),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const devicesTable = pgTable("devices", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  kind: text("kind").notNull(),
  online: boolean("online").notNull().default(true),
  lastHashrateGhs: doublePrecision("last_hashrate_ghs").notNull().default(0),
  lastPowerWatts: doublePrecision("last_power_watts").notNull().default(0),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
});

export const achievementsTable = pgTable("achievements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sticker: text("sticker").notNull(),
  earnedAt: timestamp("earned_at"),
  progress: doublePrecision("progress").notNull().default(0),
});

export const missionsTable = pgTable("missions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  target: doublePrecision("target").notNull(),
  current: doublePrecision("current").notNull().default(0),
  unit: text("unit").notNull(),
  rewardXp: integer("reward_xp").notNull().default(50),
  completed: boolean("completed").notNull().default(false),
  resetAt: timestamp("reset_at").notNull().defaultNow(),
});

export const aiMessagesTable = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  model: text("model").notNull(),
  content: text("content").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MinerConfigRow = typeof minerConfigTable.$inferSelect;
export type TelemetryRow = typeof telemetryTable.$inferSelect;
export type DeviceRow = typeof devicesTable.$inferSelect;
export type AchievementRow = typeof achievementsTable.$inferSelect;
export type MissionRow = typeof missionsTable.$inferSelect;
export type AiMessageRow = typeof aiMessagesTable.$inferSelect;
