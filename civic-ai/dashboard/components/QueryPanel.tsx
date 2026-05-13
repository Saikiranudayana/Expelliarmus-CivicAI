"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Search, Loader2, AlertCircle, ExternalLink, FileText, Globe } from "lucide-react";
import { ask, type AskResponse } from "@/lib/api";

export default function QueryPanel() {
  const [question, setQuestion] = useState("");
  const [result, setResult]     = useState<AskResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const data = await ask(question.trim());
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Search form ────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: "rgba(225,224,204,0.4)" }} />
          <input
            className="w-full bg-[#101010] border border-[rgba(222,219,200,0.12)] rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-[rgba(222,219,200,0.35)] transition-colors placeholder:opacity-40"
            style={{ color: "#E1E0CC" }}
            placeholder="Ask about BBMP budgets, ward decisions, policies…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "#DEDBC8", color: "#000" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Ask
        </button>
      </form>

      {/* ── Loading skeleton ───────────────────────────────────────────── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {[80, 60, 90, 50].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded-full animate-pulse"
                style={{ width: `${w}%`, background: "rgba(222,219,200,0.08)" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl bg-red-950/30 border border-red-800/40 p-4"
        >
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      {/* ── Result ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Markdown answer */}
            <div className="bg-[#101010] border border-[rgba(222,219,200,0.1)] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-5 rounded-md bg-[#DEDBC8]/10 flex items-center justify-center">
                  <Search className="h-3 w-3" style={{ color: "#DEDBC8" }} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "rgba(225,224,204,0.5)" }}>
                  CIVIC AI Response
                </span>
              </div>
              <div className="civic-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.answer}
                </ReactMarkdown>
              </div>
            </div>

            {/* Web sources */}
            {result.web_sources && result.web_sources.length > 0 && (
              <div className="bg-[#101010] border border-[rgba(222,219,200,0.08)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-3.5 w-3.5" style={{ color: "rgba(225,224,204,0.5)" }} />
                  <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "rgba(225,224,204,0.4)" }}>
                    Live Web Sources
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.web_sources.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] rounded-lg px-3 py-1.5 border border-[rgba(222,219,200,0.1)] hover:border-[rgba(222,219,200,0.25)] transition-colors truncate max-w-[220px]"
                      style={{ color: "rgba(225,224,204,0.6)" }}
                    >
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      {url.replace(/^https?:\/\//, "").split("/")[0]}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Citations */}
            {result.citations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-3.5 w-3.5" style={{ color: "rgba(225,224,204,0.5)" }} />
                  <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "rgba(225,224,204,0.4)" }}>
                    Document Citations ({result.citations.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {result.citations.map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-xl border border-[rgba(222,219,200,0.08)] bg-[#101010] p-3 text-xs"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-medium truncate max-w-[70%]" style={{ color: "#DEDBC8" }}>
                          [{i + 1}] {c.source.split(/[\\/]/).pop()}
                        </span>
                        <span
                          className="text-[10px] rounded-full px-2 py-0.5 border border-[rgba(222,219,200,0.1)]"
                          style={{ color: "rgba(225,224,204,0.4)" }}
                        >
                          {(c.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="line-clamp-2" style={{ color: "rgba(225,224,204,0.5)" }}>
                        {c.text}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

