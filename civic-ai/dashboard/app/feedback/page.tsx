"use client";

import Link from "next/link";
import { useState } from "react";

const CATEGORIES = [
  { id: "bug",        emoji: "🐛", title: "Bug Report",  desc: "Something isn't working" },
  { id: "wrong_data", emoji: "📊", title: "Wrong Data",  desc: "Incorrect government data" },
  { id: "suggestion", emoji: "💡", title: "Suggestion",  desc: "Feature or improvement idea" },
  { id: "praise",     emoji: "🙏", title: "Praise",      desc: "Something you love" },
  { id: "other",      emoji: "💬", title: "Other",       desc: "General feedback" },
];

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ── shared input style ─────────────────────────────────────────────────── */
const INPUT_CLS =
  "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  borderColor: "rgba(222,219,200,0.15)",
  color: "#E1E0CC",
};

export default function FeedbackPage() {
  const [category, setCategory] = useState("suggestion");
  const [subject,  setSubject]  = useState("");
  const [message,  setMessage]  = useState("");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState("");

  const canSubmit = !loading && subject.trim().length > 0 && message.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: category,
          subject: subject.trim(),
          message: message.trim(),
          name:  name.trim()  || null,
          email: email.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? `Submission failed: ${err.message}` : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Success ─────────────────────────────────────────────────────────── */
  if (success) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "#0c0c0c", fontFamily: "Almarai, system-ui, sans-serif" }}
      >
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-extrabold mb-3" style={{ color: "#E1E0CC" }}>Thank you!</h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(225,224,204,0.55)" }}>
            Your feedback has been received. If you left an email address, we&apos;ll get back to
            you within 24 hours.
          </p>
          <div className="flex items-center justify-center gap-5 mt-8 text-sm">
            <button
              onClick={() => { setSuccess(false); setSubject(""); setMessage(""); setName(""); setEmail(""); setCategory("suggestion"); }}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Send another
            </button>
            <span style={{ color: "rgba(225,224,204,0.2)" }}>·</span>
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              ← Back to CIVIC AI
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ── Form ─────────────────────────────────────────────────────────────── */
  return (
    <main
      className="min-h-screen py-12 px-4"
      style={{ background: "#0c0c0c", fontFamily: "Almarai, system-ui, sans-serif" }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            ← Back to CIVIC AI
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-4xl mb-3">💬</div>
          <h1 className="text-3xl font-extrabold" style={{ color: "#E1E0CC" }}>
            Share Your Feedback
          </h1>
          <p className="mt-2 text-sm max-w-md mx-auto leading-relaxed" style={{ color: "rgba(225,224,204,0.5)" }}>
            Found wrong data? Have a suggestion? Love something?<br />
            Your feedback makes this platform better for every Indian citizen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Category */}
          <fieldset>
            <legend className="block text-sm font-semibold mb-3" style={{ color: "rgba(225,224,204,0.75)" }}>
              What kind of feedback?
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(({ id, emoji, title, desc }) => {
                const active = category === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    className="rounded-xl border p-4 text-left transition-all"
                    style={{
                      background: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
                      borderColor: active ? "rgba(59,130,246,0.5)" : "rgba(222,219,200,0.1)",
                    }}
                  >
                    <div className="text-xl mb-1.5">{emoji}</div>
                    <div className="text-[13px] font-semibold" style={{ color: active ? "rgba(147,197,253,1)" : "#E1E0CC" }}>
                      {title}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: "rgba(225,224,204,0.4)" }}>{desc}</div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Subject */}
          <div>
            <label htmlFor="fb-subject" className="block text-sm font-semibold mb-1.5" style={{ color: "rgba(225,224,204,0.75)" }}>
              Subject <span className="text-red-400">*</span>
            </label>
            <input
              id="fb-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your feedback"
              maxLength={200}
              required
              className={INPUT_CLS}
              style={INPUT_STYLE}
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="fb-message" className="block text-sm font-semibold mb-1.5" style={{ color: "rgba(225,224,204,0.75)" }}>
              Message <span className="text-red-400">*</span>
            </label>
            <textarea
              id="fb-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              placeholder="Please describe in detail. For data errors, mention the specific district, module, and correct value."
              rows={6}
              required
              className={INPUT_CLS + " resize-y"}
              style={INPUT_STYLE}
            />
            <div className="text-right text-[11px] mt-1" style={{ color: "rgba(225,224,204,0.35)" }}>
              {message.length}/2000
            </div>
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fb-name" className="block text-sm font-semibold mb-1.5" style={{ color: "rgba(225,224,204,0.75)" }}>
                Your Name <span className="text-[11px] font-normal" style={{ color: "rgba(225,224,204,0.4)" }}>(optional)</span>
              </label>
              <input
                id="fb-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should we address you?"
                className={INPUT_CLS}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label htmlFor="fb-email" className="block text-sm font-semibold mb-1.5" style={{ color: "rgba(225,224,204,0.75)" }}>
                Email <span className="text-[11px] font-normal" style={{ color: "rgba(225,224,204,0.4)" }}>(optional)</span>
              </label>
              <input
                id="fb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="If you want a response"
                className={INPUT_CLS}
                style={INPUT_STYLE}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-sm px-4 py-3 rounded-xl border text-red-300"
              style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Submitting…" : "Submit Feedback"}
          </button>
        </form>

        {/* Footer */}
        <div
          className="flex items-center justify-center gap-4 text-xs mt-8 pt-6"
          style={{ borderTop: "1px solid rgba(222,219,200,0.08)", color: "rgba(225,224,204,0.35)" }}
        >
          <Link href="/about"   className="hover:text-[rgba(225,224,204,0.65)] transition-colors">About</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-[rgba(225,224,204,0.65)] transition-colors">Privacy</Link>
          <span>·</span>
          <Link href="/"        className="hover:text-[rgba(225,224,204,0.65)] transition-colors">← Back to App</Link>
        </div>
      </div>
    </main>
  );
}
