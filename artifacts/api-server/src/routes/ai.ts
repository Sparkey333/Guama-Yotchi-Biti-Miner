import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { AiChatBody } from "@workspace/api-zod";
import { db, aiMessagesTable } from "@workspace/db";

const router: IRouter = Router();

const PRESETS = [
  { id: "tune-eco", label: "Tune for Eco", prompt: "Help me squeeze max efficiency out of my Eco profile on a Pi 5 + ESP32 NMMiner. What undervolt and clock should I try?", category: "optimization" as const },
  { id: "solar-goalzero", label: "Solar via Goal Zero", prompt: "I run on a Goal Zero Yeti 500. Plan a daily mining schedule based on my battery % so I never drain below 20%.", category: "solar" as const },
  { id: "wallet-setup", label: "Wallet & pool setup", prompt: "Walk me through creating a BTC wallet and pointing my miner at solo.ckpool.org with my own worker name.", category: "connector" as const },
  { id: "raspi-script", label: "Pi headless script", prompt: "Generate a systemd unit so my Raspberry Pi auto-starts the Guama-Yotchi miner on boot and posts telemetry to this app.", category: "automation" as const },
  { id: "esp32-flash", label: "Flash my ESP32", prompt: "Step by step: flash NMMiner to a fresh ESP32-S3 and connect it to my Guama-Yotchi via Wi-Fi.", category: "hardware" as const },
  { id: "buddy-personality", label: "Roast my buddy", prompt: "Give my buddy RIPPER three new sk8er-punk catchphrases for when hashrate drops.", category: "gamify" as const },
  { id: "missions-daily", label: "New daily missions", prompt: "Invent 3 fresh daily missions that mix mining goals and Tamagotchi care.", category: "gamify" as const },
  { id: "profit-window", label: "When should I mine?", prompt: "Look at the 24h profit heatmap — when's the prime time to crank Turbo this week?", category: "optimization" as const },
];

router.get("/presets", (_req, res) => {
  res.json(PRESETS);
});

const SYSTEM_PROMPT = `You are RIPPER, the AI buddy for Guama-Yotchi-Biti-Miner — a 90s sk8er-punk Tamagotchi BTC miner. You speak with chunky skater energy (think 1996 Tony Hawk + Limp Bizkit + ham radio nerd) but you give technically correct answers about Bitcoin mining, Stratum pools, ESP32 NMMiner, Raspberry Pi headless setups, Goal Zero solar power, and overclocking. Keep replies short, punchy, and useful. No emojis. Use ALL CAPS for hype words sparingly.`;

router.post("/chat", async (req, res) => {
  let body: { message: string; model: "claude" | "gpt" };
  try {
    body = AiChatBody.parse(req.body);
  } catch (e) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let full = "";
  try {
    if (body.model === "claude") {
      const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
      const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      if (!baseURL || !apiKey) throw new Error("Anthropic integration not configured");
      const client = new Anthropic({ baseURL, apiKey });
      const stream = client.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: body.message }],
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          full += event.delta.text;
          res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
        }
      }
    } else {
      const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (!baseURL || !apiKey) throw new Error("OpenAI integration not configured");
      const client = new OpenAI({ baseURL, apiKey });
      const stream = await client.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 8192,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: body.message },
        ],
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          full += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
    }

    await db.insert(aiMessagesTable).values([
      { role: "user", model: body.model, content: body.message },
      { role: "assistant", model: body.model, content: full },
    ]);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    res.write(`data: ${JSON.stringify({ content: `\n[error: ${msg}]` })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

export default router;
