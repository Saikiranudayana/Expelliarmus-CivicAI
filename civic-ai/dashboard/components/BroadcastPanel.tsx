"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, CheckCircle, AlertCircle, UserPlus, Trash2, Users } from "lucide-react";
import {
  registerSubscriber,
  listSubscribers,
  removeSubscriber,
  broadcastToSubscribers,
} from "@/lib/api";

const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL ?? "http://localhost:3000";

export default function BroadcastPanel() {
  // ── Broadcast state ──
  const [message, setMessage] = useState("");
  const [phone, setPhone]     = useState("");
  const [status, setStatus]   = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError]     = useState("");

  // ── Notify Subscribers state ──
  const [notifyMsg, setNotifyMsg]         = useState("");
  const [notifyStatus, setNotifyStatus]   = useState<"idle" | "sending" | "done" | "error">("idle");
  const [notifyResult, setNotifyResult]   = useState("");

  // ── Subscriber state ──
  const [subPhone, setSubPhone]           = useState("");
  const [subStatus, setSubStatus]         = useState<"idle" | "loading" | "done" | "error">("idle");
  const [subMessage, setSubMessage]       = useState("");
  const [subscribers, setSubscribers]     = useState<string[]>([]);
  const [loadingSubs, setLoadingSubs]     = useState(false);
  const [removingPhone, setRemovingPhone] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer]     = useState(false);

  useEffect(() => {
    // detect role from JWT payload
    try {
      const token = localStorage.getItem("civic_ai_token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role === "organizer") {
          setIsOrganizer(true);
          fetchSubscribers();
        }
      }
    } catch { /* ignore */ }
  }, []);

  async function fetchSubscribers() {
    setLoadingSubs(true);
    try {
      const res = await listSubscribers();
      setSubscribers(res.subscribers);
    } catch { /* no-op if not organizer */ }
    finally { setLoadingSubs(false); }
  }

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!notifyMsg.trim()) return;
    setNotifyStatus("sending");
    setNotifyResult("");
    try {
      const res = await broadcastToSubscribers(notifyMsg.trim());
      if (res.detail) {
        setNotifyResult(res.detail);
      } else {
        setNotifyResult(`✓ Sent to ${res.sent} subscriber${res.sent !== 1 ? "s" : ""}${res.failed ? ` (${res.failed} failed)` : ""}.`);
      }
      setNotifyStatus("done");
      setNotifyMsg("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Broadcast failed";
      setNotifyResult(msg);
      setNotifyStatus("error");
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !phone.trim()) return;
    setStatus("sending");
    setError("");

    try {
      const payload = {
        object: "whatsapp_business_account",
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: phone.replace(/\D/g, ""),
                type: "text",
                text: { body: message },
              }],
            },
          }],
        }],
      };

      const res = await fetch(`${WEBHOOK_URL}/webhook`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      setStatus("done");
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Send failed");
      setStatus("error");
    }
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = subPhone.trim().replace(/^\+/, "");
    if (!cleaned) return;
    setSubStatus("loading");
    setSubMessage("");
    try {
      const res = await registerSubscriber(cleaned);
      setSubMessage(`✓ Registered! Total subscribers: ${res.total}`);
      setSubStatus("done");
      setSubPhone("");
      if (isOrganizer) fetchSubscribers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setSubMessage(msg);
      setSubStatus("error");
    }
  }

  async function handleRemove(p: string) {
    setRemovingPhone(p);
    try {
      await removeSubscriber(p);
      setSubscribers((prev) => prev.filter((s) => s !== p));
    } catch { /* ignore */ }
    finally { setRemovingPhone(null); }
  }

  const inputClass =
    "w-full bg-[#1a1a1a] border border-[rgba(222,219,200,0.1)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[rgba(222,219,200,0.3)] transition-colors placeholder:opacity-40";
  const inputStyle = { color: "#E1E0CC" };
  const labelStyle = { color: "rgba(225,224,204,0.45)" };

  return (
    <div className="space-y-8">

      {/* ── Subscriber Registration ───────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" style={{ color: "#DEDBC8" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#E1E0CC" }}>
            Subscribe to Notifications
          </h3>
        </div>
        <p className="text-xs" style={labelStyle}>
          Enter your WhatsApp number to receive alerts about new BBMP documents and ward meetings.
        </p>

        <form onSubmit={handleSubscribe} className="flex gap-2">
          <input
            className={inputClass}
            style={inputStyle}
            placeholder="+91 98765 43210"
            value={subPhone}
            onChange={(e) => setSubPhone(e.target.value)}
            disabled={subStatus === "loading"}
          />
          <button
            type="submit"
            disabled={subStatus === "loading" || !subPhone.trim()}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 shrink-0"
            style={{ background: "#DEDBC8", color: "#000" }}
          >
            {subStatus === "loading"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <UserPlus className="h-4 w-4" />}
            Subscribe
          </button>
        </form>

        <AnimatePresence>
          {subMessage && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2.5 border ${
                subStatus === "done"
                  ? "border-[rgba(222,219,200,0.15)] bg-[rgba(222,219,200,0.04)]"
                  : "border-red-800/30 bg-red-950/20 text-red-400"
              }`}
              style={subStatus === "done" ? { color: "rgba(222,219,200,0.7)" } : {}}
            >
              {subStatus === "done"
                ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
              {subMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Organizer-only subscriber list */}
        {isOrganizer && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" style={labelStyle} />
              <span className="text-[10px] uppercase tracking-widest" style={labelStyle}>
                Registered subscribers ({subscribers.length})
              </span>
            </div>
            {loadingSubs && (
              <div className="flex items-center gap-2 text-xs" style={labelStyle}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            )}
            {!loadingSubs && subscribers.length === 0 && (
              <p className="text-xs" style={labelStyle}>No subscribers yet.</p>
            )}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {subscribers.map((p) => (
                <div
                  key={p}
                  className="flex items-center justify-between rounded-lg px-3 py-2 border"
                  style={{ borderColor: "rgba(222,219,200,0.08)", background: "#1a1a1a" }}
                >
                  <span className="text-xs font-mono" style={{ color: "#E1E0CC" }}>+{p}</span>
                  <button
                    onClick={() => handleRemove(p)}
                    disabled={removingPhone === p}
                    className="opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20"
                  >
                    {removingPhone === p
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#E1E0CC" }} />
                      : <Trash2 className="h-3.5 w-3.5" style={{ color: "#E1E0CC" }} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: "rgba(222,219,200,0.08)" }} />

      {/* ── Notify All Subscribers (organizer only) ───────────────────── */}
      {isOrganizer && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: "#DEDBC8" }} />
            <h3 className="text-sm font-semibold" style={{ color: "#E1E0CC" }}>
              Notify All Subscribers
            </h3>
          </div>
          <p className="text-xs" style={labelStyle}>
            Push a WhatsApp message directly to every registered subscriber via Meta Cloud API.
          </p>

          <form onSubmit={handleNotify} className="space-y-3">
            <textarea
              rows={4}
              className={`${inputClass} resize-none`}
              style={inputStyle}
              placeholder="📢 New ward meeting scheduled for 20th May at Town Hall…"
              value={notifyMsg}
              onChange={(e) => setNotifyMsg(e.target.value)}
              disabled={notifyStatus === "sending"}
            />
            <button
              type="submit"
              disabled={notifyStatus === "sending" || !notifyMsg.trim()}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: "#DEDBC8", color: "#000" }}
            >
              {notifyStatus === "sending"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />}
              Send to All Subscribers
            </button>
          </form>

          <AnimatePresence>
            {notifyResult && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2.5 border ${
                  notifyStatus === "done"
                    ? "border-[rgba(222,219,200,0.15)] bg-[rgba(222,219,200,0.04)]"
                    : "border-red-800/30 bg-red-950/20 text-red-400"
                }`}
                style={notifyStatus === "done" ? { color: "rgba(222,219,200,0.7)" } : {}}
              >
                {notifyStatus === "done"
                  ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                {notifyResult}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: "rgba(222,219,200,0.08)" }} />

      {/* ── WhatsApp Broadcast ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4" style={{ color: "#DEDBC8" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#E1E0CC" }}>
            Send Direct Message
          </h3>
        </div>
        <p className="text-xs" style={labelStyle}>
          Dispatch a WhatsApp message — the webhook will query CIVIC AI and reply to the recipient.
        </p>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium uppercase tracking-widest" style={labelStyle}>
              Recipient Phone (E.164, e.g. 919876543210)
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={status === "sending"}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium uppercase tracking-widest" style={labelStyle}>
              Message / Query
            </label>
            <textarea
              rows={4}
              className={`${inputClass} resize-none`}
              style={inputStyle}
              placeholder="What are the BBMP ward meeting dates this month?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={status === "sending"}
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending" || !message.trim() || !phone.trim()}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: "#DEDBC8", color: "#000" }}
          >
            {status === "sending"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
            Send via WhatsApp
          </button>
        </form>

        <AnimatePresence>
          {status === "done" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs"
              style={{ color: "rgba(222,219,200,0.7)" }}
            >
              <CheckCircle className="h-4 w-4" />
              Message dispatched — recipient will receive a CIVIC AI reply.
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 text-xs text-red-400 rounded-xl bg-red-950/20 border border-red-800/30 p-3"
            >
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
