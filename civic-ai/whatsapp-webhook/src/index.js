"use strict";

require("dotenv").config();

const express = require("express");
const { sendTextMessage, askCivicAI, formatReply } = require("./whatsapp");

const app = express();
app.use(express.json());

// Allow cross-origin requests from the Next.js dashboard
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const PORT = parseInt(process.env.PORT || "3000", 10);

// ─────────────────────────────────────────────────────────────────────────────
// GET /webhook  — Meta webhook verification handshake
// Meta sends ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// We must echo back hub.challenge if the token matches.
// ─────────────────────────────────────────────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[webhook] Verification handshake accepted");
    return res.status(200).send(challenge);
  }

  console.warn("[webhook] Verification failed — token mismatch or wrong mode");
  return res.sendStatus(403);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /webhook  — Incoming messages from WhatsApp Cloud API
// ─────────────────────────────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  // Always acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;

    // Validate it's a WhatsApp message event
    if (body.object !== "whatsapp_business_account") return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Skip status updates (delivered, read, etc.)
    if (!value?.messages) return;

    const message = value.messages[0];
    const from = message.from; // sender phone number

    // Only handle plain text messages
    if (message.type !== "text") {
      await sendTextMessage(
        from,
        "👋 Hi! I'm CIVIC AI. Please send a text question and I'll look it up in BBMP records."
      );
      return;
    }

    const userText = message.text.body.trim();
    console.log(`[webhook] Message from ${from}: "${userText}"`);

    // Send a "processing" acknowledgement
    await sendTextMessage(from, "⏳ Looking that up in BBMP records…");

    // Query CIVIC AI
    const data = await askCivicAI(userText);
    const reply = formatReply(data);

    // Truncate to WhatsApp's 4096-char limit
    const truncated =
      reply.length > 4096 ? reply.slice(0, 4090) + "…" : reply;

    await sendTextMessage(from, truncated);
    console.log(`[webhook] Replied to ${from} (${truncated.length} chars)`);
  } catch (err) {
    console.error("[webhook] Error handling message:", err.message);
    // Don't re-throw — response already sent 200
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "civic-ai-whatsapp-webhook" });
});

app.listen(PORT, () => {
  console.log(`[civic-ai] WhatsApp webhook listening on http://localhost:${PORT}`);
  console.log(`[civic-ai] CIVIC AI backend → ${process.env.CIVIC_AI_URL}`);
  console.log(`[civic-ai] Verify token    → ${VERIFY_TOKEN}`);
});
