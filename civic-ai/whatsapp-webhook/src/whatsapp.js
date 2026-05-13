"use strict";

const axios = require("axios");

const BASE = "https://graph.facebook.com/v19.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const CIVIC_AI_URL = process.env.CIVIC_AI_URL || "http://localhost:8000";

/**
 * Send a text reply back to the WhatsApp sender.
 * @param {string} to  – recipient phone number in E.164 format (no +)
 * @param {string} text – message body (max ~4096 chars)
 */
async function sendTextMessage(to, text) {
  const url = `${BASE}/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

// Cached JWT for webhook → backend calls
let _cachedToken = null;

async function getServiceToken() {
  const form = new URLSearchParams();
  form.append("username", "organizer");
  form.append("password", "organizer123");
  const res = await axios.post(`${CIVIC_AI_URL}/auth/token`, form.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10_000,
  });
  return res.data.access_token;
}

/**
 * Query the CIVIC AI FastAPI /ask endpoint.
 * @param {string} question
 * @returns {{ answer: string, citations: Array }}
 */
async function askCivicAI(question) {
  // Get or refresh token
  if (!_cachedToken) {
    _cachedToken = await getServiceToken();
  }
  try {
    const response = await axios.post(
      `${CIVIC_AI_URL}/ask`,
      { question, top_k: 5 },
      {
        timeout: 60_000,
        headers: { Authorization: `Bearer ${_cachedToken}` },
      }
    );
    return response.data;
  } catch (err) {
    // Token expired — refresh once and retry
    if (err.response && err.response.status === 401) {
      _cachedToken = await getServiceToken();
      const response = await axios.post(
        `${CIVIC_AI_URL}/ask`,
        { question, top_k: 5 },
        {
          timeout: 60_000,
          headers: { Authorization: `Bearer ${_cachedToken}` },
        }
      );
      return response.data;
    }
    throw err;
  }
}

/**
 * Format a reply: answer text + up to 3 source citations.
 * @param {{ answer: string, citations: Array }} data
 * @returns {string}
 */
function formatReply(data) {
  const { answer, citations = [] } = data;

  const sources = citations
    .slice(0, 3)
    .map((c, i) => {
      // source is a file path — take just the filename
      const filename = c.source.split(/[\\/]/).pop() || c.source;
      return `[${i + 1}] ${filename}`;
    })
    .join("\n");

  return sources
    ? `${answer}\n\n📎 *Sources:*\n${sources}`
    : answer;
}

module.exports = { sendTextMessage, askCivicAI, formatReply };
