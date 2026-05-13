"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud, Search, BarChart2, Send, RefreshCw,
  CalendarDays, LogOut, MapPin,
} from "lucide-react";
import FileUploader from "@/components/FileUploader";
import QueryPanel from "@/components/QueryPanel";
import Analytics from "@/components/Analytics";
import BroadcastPanel from "@/components/BroadcastPanel";
import MeetingOrganizer from "@/components/MeetingOrganizer";
import { getStats, login, type StatsResponse } from "@/lib/api";

type Tab = "upload" | "query" | "analytics" | "broadcast" | "meetings";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "upload",    label: "Ingest Docs",  icon: <UploadCloud className="h-3.5 w-3.5" /> },
  { id: "query",     label: "Ask CIVIC AI", icon: <Search className="h-3.5 w-3.5" /> },
  { id: "analytics", label: "Analytics",    icon: <BarChart2 className="h-3.5 w-3.5" /> },
  { id: "broadcast", label: "Broadcast",    icon: <Send className="h-3.5 w-3.5" /> },
  { id: "meetings",  label: "Meetings",     icon: <CalendarDays className="h-3.5 w-3.5" /> },
];

const TAB_DESCRIPTIONS: Record<Tab, { title: string; sub: string }> = {
  upload:    { title: "Ingest Documents",  sub: "Upload PDF, CSV, or XLSX — chunked, embedded, and indexed via NVIDIA NeMo Retriever." },
  query:     { title: "Ask CIVIC AI",      sub: "RAG-powered Q&A over all BBMP documents. Responses are structured Markdown." },
  analytics: { title: "Analytics & KPIs",  sub: "Document corpus statistics, keyword word cloud, and live Bengaluru ward map." },
  broadcast: { title: "WhatsApp Broadcast",sub: "Dispatch notifications to registered residents via Meta WhatsApp Cloud API." },
  meetings:  { title: "Meeting Organizer", sub: "Schedule community meetings and notify all subscribers instantly via WhatsApp." },
};

/* ── Tab indicator animation ──────────────────────────────────────────────── */
const tabVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

/* ══════════════════════════════════════════════════════════════════════════════
   Login Screen
══════════════════════════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const token = await login(user, pass);
      localStorage.setItem("civic_ai_token", token);
      onLogin();
    } catch {
      setErr("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#DEDBC8]/[0.03] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#101010] border border-[rgba(222,219,200,0.12)] mb-5">
            <MapPin className="h-6 w-6" style={{ color: "#E1E0CC" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#E1E0CC" }}>CIVIC AI</h1>
          <p className="text-xs mt-1" style={{ color: "rgba(225,224,204,0.5)" }}>
            Bengaluru Community Platform · Powered by NVIDIA
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#101010] border border-[rgba(222,219,200,0.1)] rounded-2xl p-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "rgba(225,224,204,0.5)" }}>
                Username
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required
                className="w-full bg-[#1a1a1a] border border-[rgba(222,219,200,0.12)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[rgba(222,219,200,0.35)] transition-colors"
                style={{ color: "#E1E0CC" }}
                placeholder="resident"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "rgba(225,224,204,0.5)" }}>
                Password
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                className="w-full bg-[#1a1a1a] border border-[rgba(222,219,200,0.12)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[rgba(222,219,200,0.35)] transition-colors"
                style={{ color: "#E1E0CC" }}
                placeholder="••••••••"
              />
            </div>

            {err && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "#DEDBC8", color: "#000" }}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-[10px] text-center mt-5" style={{ color: "rgba(225,224,204,0.3)" }}>
            resident / resident123 &nbsp;·&nbsp; organizer / organizer123
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Main Dashboard
══════════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [tab, setTab]         = useState<Tab>("upload");
  const [stats, setStats]     = useState<StatsResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [authed, setAuthed]   = useState(false);
  const tabRef = useRef<Tab>(tab);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("civic_ai_token")) {
      setAuthed(true);
    }
  }, []);

  async function loadStats() {
    setRefreshing(true);
    try {
      const s = await getStats();
      setStats(s);
    } catch { /* backend may not be running */ }
    finally { setRefreshing(false); }
  }

  useEffect(() => { if (authed) loadStats(); }, [authed]);

  function handleLogout() {
    localStorage.removeItem("civic_ai_token");
    setAuthed(false);
  }

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  const currentMeta = TAB_DESCRIPTIONS[tab];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ── Ambient background ───────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-[#DEDBC8]/[0.025] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#DEDBC8]/[0.015] blur-[100px]" />
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-[rgba(222,219,200,0.08)] bg-black/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#101010] border border-[rgba(222,219,200,0.12)] flex items-center justify-center">
              <MapPin className="h-4 w-4" style={{ color: "#E1E0CC" }} />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none" style={{ color: "#E1E0CC" }}>CIVIC AI</h1>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(225,224,204,0.4)" }}>
                Organizer Dashboard · NVIDIA NIM
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={loadStats}
              className="flex items-center gap-2 text-xs rounded-full px-4 py-2 border border-[rgba(222,219,200,0.12)] bg-[#101010] hover:bg-[#181818] transition-colors"
              style={{ color: "rgba(225,224,204,0.7)" }}
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              {stats ? `${stats.total_indexed.toLocaleString()} chunks` : "Connecting…"}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs rounded-full px-4 py-2 border border-[rgba(222,219,200,0.08)] hover:border-[rgba(222,219,200,0.2)] bg-transparent transition-colors"
              style={{ color: "rgba(225,224,204,0.4)" }}
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Tab navigation ───────────────────────────────────────────────── */}
      <nav className="relative z-10 border-b border-[rgba(222,219,200,0.06)] bg-black/60 backdrop-blur-xl px-6">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`
                relative flex items-center gap-2 px-4 py-3.5 text-xs font-medium whitespace-nowrap transition-colors
                ${tab === id ? "" : "hover:opacity-70"}
              `}
              style={{
                color: tab === id ? "#E1E0CC" : "rgba(225,224,204,0.4)",
              }}
            >
              {icon}
              {label}
              {tab === id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[1.5px]"
                  style={{ background: "#DEDBC8" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Page heading ─────────────────────────────────────────────────── */}
      <div className="relative z-10 border-b border-[rgba(222,219,200,0.05)] px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab + "-heading"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="font-bold text-base" style={{ color: "#E1E0CC" }}>
                {currentMeta.title}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(225,224,204,0.45)" }}>
                {currentMeta.sub}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {tab === "upload" && (
                <FileUploader onSuccess={loadStats} />
              )}
              {tab === "query" && <QueryPanel />}
              {tab === "analytics" && (
                <Analytics totalIndexed={stats?.total_indexed ?? 0} />
              )}
              {tab === "broadcast" && <BroadcastPanel />}
              {tab === "meetings" && <MeetingOrganizer />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[rgba(222,219,200,0.05)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-[10px]" style={{ color: "rgba(225,224,204,0.25)" }}>
            CIVIC AI · BBMP Community Platform
          </p>
          <p className="text-[10px]" style={{ color: "rgba(225,224,204,0.25)" }}>
            Powered by NVIDIA NIM · ChromaDB · Tavily
          </p>
        </div>
      </footer>
    </div>
  );
}

