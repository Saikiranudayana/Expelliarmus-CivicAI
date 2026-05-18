"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Fuel, Thermometer, Newspaper, Landmark, ExternalLink } from "lucide-react";
import InlineChatbot from "./InlineChatbot";

// ─── City civic data ──────────────────────────────────────────────────────────
interface CityInfo {
  petrol: number;
  temp: number;
  weatherDesc: string;
  news: string;
  newsUrl: string;
  budget_cr: number;
  budget_body: string;
  live: boolean;
}

interface CityMeta {
  localName: string;
  icon: string;
  tagline: string;
  tags: string[];
  state: string;
  badge?: string;
}

const CITY_DATA: Record<string, CityInfo> = {
  "Bengaluru Urban": { petrol: 102.86, temp: 34, weatherDesc: "Partly Cloudy", news: "BBMP fast-tracks \u20b92,400\u00a0Cr white-topping for 215\u00a0km roads", newsUrl: "https://news.google.com/search?q=BBMP+white+topping+roads+2026&hl=en-IN&gl=IN", budget_cr: 17037, budget_body: "BBMP", live: true },
  "Chennai":         { petrol: 100.85, temp: 38, weatherDesc: "Hot & Humid",   news: "GCC commissions solar-powered bus shelters across 400 stops",              newsUrl: "https://news.google.com/search?q=GCC+Chennai+solar+bus+shelter+2026&hl=en-IN&gl=IN",          budget_cr: 8432,  budget_body: "GCC",       live: false },
  "Hyderabad":       { petrol: 107.41, temp: 40, weatherDesc: "Scorching",     news: "GHMC approves \u20b9800\u00a0Cr underground drainage upgrade in Old City",  newsUrl: "https://news.google.com/search?q=GHMC+drainage+upgrade+Old+City+2026&hl=en-IN&gl=IN",         budget_cr: 14882, budget_body: "GHMC",      live: false },
  "Kolkata":         { petrol: 103.94, temp: 37, weatherDesc: "Humid",         news: "KMC launches \u20b91,200\u00a0Cr riverfront beautification phase IV",        newsUrl: "https://news.google.com/search?q=KMC+Kolkata+riverfront+2026&hl=en-IN&gl=IN",                   budget_cr: 5832,  budget_body: "KMC",       live: false },
  "Lucknow":         { petrol:  94.65, temp: 43, weatherDesc: "Very Hot",      news: "LDA green-lights \u20b9650\u00a0Cr Gomti riverbank smart walkway",           newsUrl: "https://news.google.com/search?q=LDA+Lucknow+Gomti+riverbank+2026&hl=en-IN&gl=IN",             budget_cr: 2647,  budget_body: "LMC",       live: false },
  "Mandya":          { petrol: 102.86, temp: 36, weatherDesc: "Hot",           news: "Mandya gets \u20b9180\u00a0Cr for sugarcane waste-to-energy plant",          newsUrl: "https://news.google.com/search?q=Mandya+waste+energy+plant+2026&hl=en-IN&gl=IN",               budget_cr: 312,   budget_body: "Mandya MC", live: false },
  "Mumbai":          { petrol: 103.44, temp: 35, weatherDesc: "Muggy",         news: "BMC proposes 3 new coastal road stretches worth \u20b94,600\u00a0Cr",         newsUrl: "https://news.google.com/search?q=BMC+Mumbai+coastal+road+2026&hl=en-IN&gl=IN",                budget_cr: 59954, budget_body: "BMC",       live: false },
  "Mysuru":          { petrol: 102.86, temp: 33, weatherDesc: "Warm",          news: "MCC secures \u20b990\u00a0Cr UIDSSMT grant for water supply expansion",       newsUrl: "https://news.google.com/search?q=MCC+Mysuru+UIDSSMT+water+supply+2026&hl=en-IN&gl=IN",         budget_cr: 1823,  budget_body: "MCC",       live: false },
  "New Delhi":       { petrol:  94.72, temp: 45, weatherDesc: "Extreme Heat",  news: "MCD rolls out 100 bio-CNG plants across 270 new colonies",                   newsUrl: "https://news.google.com/search?q=MCD+Delhi+bio+CNG+colonies+2026&hl=en-IN&gl=IN",             budget_cr: 17053, budget_body: "MCD",       live: false },
  "Pune":            { petrol: 103.44, temp: 38, weatherDesc: "Hot",           news: "PMC awards contract for 18\u00a0km metro Phase\u00a02 feeder bus network",    newsUrl: "https://news.google.com/search?q=PMC+Pune+metro+feeder+bus+2026&hl=en-IN&gl=IN",             budget_cr: 10756, budget_body: "PMC",       live: false },
};

const CITY_META: Record<string, CityMeta> = {
  "Bengaluru Urban": { localName: "\u0c95\u0cc6\u0c82\u0c97\u0cb3\u0cc2\u0cb0\u0cc1 \u0ca8\u0c97\u0cb0", icon: "\ud83d\udda5\ufe0f", tagline: "Silicon Valley of India",      tags: ["Startup Capital of India", "Garden City", "ISRO & HAL HQ"],        state: "Karnataka",      badge: "LIVE" },
  "Chennai":         { localName: "\u0b9a\u0bc6\u0ba9\u0bcd\u0ba9\u0bc8",                                    icon: "\ud83c\udf0a",       tagline: "Gateway to South India",      tags: ["Detroit of India", "Marina Beach", "India\u2019s Health Capital"], state: "Tamil Nadu" },
  "Hyderabad":       { localName: "\u0c39\u0c48\u0c26\u0c30\u0c3e\u0c2c\u0c3e\u0c26\u0c4d",                 icon: "\ud83c\udff0",       tagline: "City of Pearls",              tags: ["City of Pearls", "Genome Valley", "Nizam Heritage"],               state: "Telangana" },
  "Kolkata":         { localName: "\u0995\u09b2\u0995\u09be\u09a4\u09be",                                    icon: "\ud83c\udf09",       tagline: "Cultural Capital of India",   tags: ["Cultural Capital of India", "Nobel Laureate City", "Durga Puja U\u2026"], state: "West Bengal" },
  "Lucknow":         { localName: "\u0932\u0916\u0928\u090a",                                                icon: "\ud83d\udd4c",       tagline: "City of Nawabs",              tags: ["City of Nawabs", "Chikankari Heritage", "Kebab Capital"],           state: "Uttar Pradesh" },
  "Mandya":          { localName: "\u0cae\u0c82\u0ca1\u0ccd\u0caf",                                          icon: "\ud83c\udf3e",       tagline: "Sugar Capital of Karnataka",  tags: ["Sugar Capital of Karnataka", "Home of KRS Dam", "Kaveri Basin \u2026"], state: "Karnataka" },
  "Mumbai":          { localName: "\u092e\u0941\u0902\u092c\u0908",                                          icon: "\ud83c\udfd9\ufe0f", tagline: "Financial Capital of India",  tags: ["Financial Capital", "Bollywood", "Gateway of India"],              state: "Maharashtra" },
  "Mysuru":          { localName: "\u0cae\u0cc8\u0cb8\u0cc2\u0cb0\u0cc1",                                    icon: "\ud83c\udfef",       tagline: "City of Palaces",             tags: ["Dasara Capital", "Sandalwood City", "Mysore Palace"],               state: "Karnataka" },
  "New Delhi":       { localName: "\u0928\u0908 \u0926\u093f\u0932\u094d\u0932\u0940",                       icon: "\ud83c\udfd9\ufe0f", tagline: "Capital of India",             tags: ["Political Hub", "UNESCO Heritage", "India Gate"],                   state: "Delhi" },
  "Pune":            { localName: "\u092a\u0941\u0923\u0947",                                                icon: "\ud83c\udfd7\ufe0f", tagline: "Oxford of the East",          tags: ["Auto + IT Hub", "Oxford of the East", "Khadakwasia Reservoir"],    state: "Maharashtra",    badge: "NEW" },
};

const CITIES = Object.keys(CITY_DATA);

/** States where we have any city data (shown blue on map) */
const ACTIVE_STATES = [
  "Karnataka", "Maharashtra", "Tamil Nadu", "Telangana",
  "West Bengal", "Uttar Pradesh", "Delhi",
];

/** States we plan to cover soon (shown gray) */
const COMING_SOON_STATES = [
  "Andhra Pradesh", "Gujarat", "Rajasthan", "Punjab",
  "Kerala", "Bihar", "Odisha", "Madhya Pradesh", "Haryana", "Goa",
];

/** Map a state name (from GeoJSON) → default city to select */
const STATE_TO_CITY: Record<string, string> = {
  Karnataka:      "Bengaluru Urban",
  Maharashtra:    "Mumbai",
  "Tamil Nadu":   "Chennai",
  Telangana:      "Hyderabad",
  "West Bengal":  "Kolkata",
  "Uttar Pradesh":"Lucknow",
  "NCT of Delhi": "New Delhi",
  Delhi:          "New Delhi",
};

// ─── API stats ────────────────────────────────────────────────────────────────
interface PlatformStats {
  documents_ingested: number;
  queries_today: number;
  avg_response_ms: number | null;
  latest_headline: string | null;
  last_refresh_ts: number;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchStats(): Promise<PlatformStats> {
  const res = await fetch(`${BASE}/stats`, {
    headers: { "bypass-tunnel-reminder": "true" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`/stats ${res.status}`);
  return res.json() as Promise<PlatformStats>;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function tempColor(t: number): string {
  if (t >= 44) return "#f87171";
  if (t >= 40) return "#fb923c";
  if (t >= 36) return "#fbbf24";
  return "#4ade80";
}

function formatAge(ts: number): string {
  const sec = Math.round(Date.now() / 1000 - ts);
  if (sec < 60) return "just now";
  return `${Math.round(sec / 60)}m ago`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function Card({
  icon,
  label,
  value,
  sub,
  valueColor,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex flex-col gap-2 bg-[#0d0d0d] px-5 py-4 h-full transition-colors hover:bg-[#111]">
      <div className="flex items-center gap-2">
        <span className="opacity-45" style={{ color: "#E1E0CC" }}>
          {icon}
        </span>
        <span
          className="text-[10px] font-medium uppercase tracking-widest"
          style={{ color: "rgba(225,224,204,0.38)" }}
        >
          {label}
        </span>
        {href && (
          <ExternalLink
            className="ml-auto h-3 w-3 opacity-20 group-hover:opacity-50 transition-opacity"
            style={{ color: "#93c5fd" }}
          />
        )}
      </div>
      {value && (
        <div
          className="text-2xl font-bold leading-none"
          style={{ color: valueColor ?? "#E1E0CC" }}
        >
          {value}
        </div>
      )}
      {sub && (
        <div
          className="text-[11px] leading-snug line-clamp-3 mt-0.5"
          style={{ color: "rgba(225,224,204,0.42)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );

  if (href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full group"
        title="Open in Google News"
      >
        {inner}
      </a>
    );
  return <div className="h-full">{inner}</div>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CityStatsBanner() {
  const [selected, setSelected] = useState("Bengaluru Urban");

  const {
    data: stats,
    error: statsErr,
    isLoading,
  } = useSWR<PlatformStats>("/stats", fetchStats, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const city = CITY_DATA[selected];
  const meta = CITY_META[selected];

  const newsText =
    city.live && !isLoading && !statsErr && stats?.latest_headline
      ? stats.latest_headline
      : city.news;

  return (
    <div className="rounded-2xl border border-[rgba(222,219,200,0.12)] bg-[#0c0c0c] overflow-hidden mb-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
      {/* ── Mini nav ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end px-5 py-1.5 gap-4 border-b border-[rgba(222,219,200,0.04)]">
        {[["About", "/about"], ["Privacy", "/privacy"], ["Feedback", "/feedback"]].map(
          ([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-[10px] transition-colors hover:opacity-70"
              style={{ color: "rgba(225,224,204,0.32)" }}
            >
              {label}
            </Link>
          )
        )}
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(222,219,200,0.08)]">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400 shadow-[0_0_7px_2px_rgba(74,222,128,0.55)]" />
          <span className="text-xs font-semibold text-green-400">
            Live Civic Intelligence
          </span>
          {stats && (
            <span
              className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full border border-[rgba(222,219,200,0.1)] bg-[rgba(222,219,200,0.04)]"
              style={{ color: "rgba(225,224,204,0.4)" }}
            >
              Refreshed {formatAge(stats.last_refresh_ts)}
            </span>
          )}
        </div>
        <span className="text-[10px]" style={{ color: "rgba(225,224,204,0.3)" }}>
          10 cities · Municipal data FY 2025-26
        </span>
      </div>

      {/* ── Chatbot + City list ──────────────────────────────────────────────────────── */}
      <div className="flex" style={{ minHeight: 480, maxHeight: 560 }}>
        {/* Left: inline chatbot */}
        <div className="flex-1 border-r border-[rgba(222,219,200,0.06)] overflow-hidden">
          <InlineChatbot />
        </div>

        {/* Right: scrollable city directory */}
        <div
          className="w-80 flex-shrink-0 overflow-y-auto no-scrollbar"
          style={{ background: "#0a0a0a" }}
        >
          {/* Column header */}
          <div
            className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-[rgba(222,219,200,0.08)]"
            style={{ background: "#0a0a0a" }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
            <span
              className="text-xs font-semibold"
              style={{ color: "#E1E0CC" }}
            >
              LIVE
            </span>
            <span
              className="text-xs"
              style={{ color: "rgba(225,224,204,0.4)" }}
            >
              10 districts
            </span>
          </div>

          {/* City rows */}
          {CITIES.map((name) => {
            const m = CITY_META[name];
            const d = CITY_DATA[name];
            const isSelected = name === selected;
            return (
              <button
                key={name}
                onClick={() => setSelected(name)}
                className="w-full text-left border-b border-[rgba(222,219,200,0.05)] transition-colors"
                style={{
                  padding: "11px 16px",
                  background: isSelected
                    ? "rgba(59,130,246,0.07)"
                    : "transparent",
                  borderLeft: isSelected
                    ? "2px solid #3b82f6"
                    : "2px solid transparent",
                }}
              >
                {/* Row 1: icon · dot · name · local script · badge + temp */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none flex-shrink-0">
                    {m.icon}
                  </span>
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: d.live
                        ? "#4ade80"
                        : "rgba(225,224,204,0.25)",
                      boxShadow: d.live
                        ? "0 0 4px rgba(74,222,128,0.7)"
                        : "none",
                    }}
                  />
                  <span
                    className="text-[12px] font-semibold leading-tight flex-shrink-0"
                    style={{
                      color: isSelected
                        ? "#E1E0CC"
                        : "rgba(225,224,204,0.72)",
                    }}
                  >
                    {name}
                  </span>
                  <span
                    className="text-[10px] truncate"
                    style={{
                      color: "rgba(225,224,204,0.28)",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {m.localName}
                  </span>
                  {/* Badge + temp pushed to right */}
                  <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                    {m.badge && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background:
                            m.badge === "LIVE"
                              ? "rgba(74,222,128,0.12)"
                              : "rgba(59,130,246,0.12)",
                          color:
                            m.badge === "LIVE" ? "#4ade80" : "#93c5fd",
                          border: `1px solid ${
                            m.badge === "LIVE"
                              ? "rgba(74,222,128,0.25)"
                              : "rgba(93,130,246,0.25)"
                          }`,
                        }}
                      >
                        {m.badge}
                      </span>
                    )}
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: tempColor(d.temp) }}
                    >
                      ↘ {d.temp}°C
                    </span>
                  </div>
                </div>

                {/* Row 2: tagline */}
                <div
                  className="mt-1.5 text-[11px] font-medium"
                  style={{ color: "#3b82f6", paddingLeft: "1.75rem" }}
                >
                  {m.tagline}
                </div>

                {/* Row 3: tag chips */}
                <div
                  className="mt-1 flex flex-wrap gap-1"
                  style={{ paddingLeft: "1.75rem" }}
                >
                  {m.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(222,219,200,0.05)",
                        color: "rgba(225,224,204,0.35)",
                        border: "1px solid rgba(222,219,200,0.07)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected city label ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-2 border-t border-[rgba(222,219,200,0.08)] bg-[rgba(222,219,200,0.02)]">
        <span className="text-base leading-none">{meta.icon}</span>
        <span
          className="text-xs font-semibold"
          style={{ color: "rgba(225,224,204,0.65)" }}
        >
          {selected}
        </span>
        <span className="text-[10px]" style={{ color: "rgba(225,224,204,0.2)" }}>
          ·
        </span>
        <span
          className="text-[11px]"
          style={{
            color: "rgba(225,224,204,0.25)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {meta.localName}
        </span>
        <span
          className="ml-auto text-[10px] italic"
          style={{ color: "rgba(225,224,204,0.22)" }}
        >
          {meta.tagline}
        </span>
      </div>

      {/* ── 4 stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[rgba(222,219,200,0.06)]">
        <Card
          icon={<Fuel className="h-4 w-4" />}
          label="Petrol Price"
          value={`\u20b9${city.petrol.toFixed(2)}/L`}
          sub={`${selected} \u00b7 incl. state VAT`}
        />
        <Card
          icon={<Thermometer className="h-4 w-4" />}
          label="Weather \u00b7 May"
          value={`${city.temp}\u00b0C`}
          sub={city.weatherDesc}
          valueColor={tempColor(city.temp)}
        />
        <Card
          icon={<Newspaper className="h-4 w-4" />}
          label="Local News"
          value=""
          sub={newsText}
          href={city.newsUrl}
        />
        <Card
          icon={<Landmark className="h-4 w-4" />}
          label={`${city.budget_body} Budget FY\u00a026`}
          value={
            city.budget_cr >= 10000
              ? `\u20b9${(city.budget_cr / 100000).toFixed(2)}\u00a0L\u00a0Cr`
              : `\u20b9${city.budget_cr.toLocaleString("en-IN")}\u00a0Cr`
          }
          sub="Municipal allocation FY 2025-26"
          valueColor="#a78bfa"
        />
      </div>

      {/* ── Bengaluru RAG strip ──────────────────────────────────────────────── */}
      {city.live && (
        <div className="flex flex-wrap items-center gap-5 px-5 py-2.5 border-t border-[rgba(222,219,200,0.06)] bg-[rgba(74,222,128,0.03)]">
          <span className="text-[10px] font-medium uppercase tracking-widest text-green-500">
            RAG Index
          </span>
          <span className="text-xs" style={{ color: "rgba(225,224,204,0.55)" }}>
            {isLoading
              ? "Loading\u2026"
              : statsErr
              ? "Offline"
              : `${stats!.documents_ingested.toLocaleString()} docs indexed`}
          </span>
          {!isLoading && !statsErr && (
            <span className="text-xs" style={{ color: "rgba(225,224,204,0.55)" }}>
              {stats!.queries_today} queries today
            </span>
          )}
          {!isLoading && !statsErr && stats?.avg_response_ms && (
            <span className="text-xs" style={{ color: "rgba(225,224,204,0.55)" }}>
              Avg {(stats.avg_response_ms / 1000).toFixed(1)}s \u00b7 NVIDIA NIM
            </span>
          )}
        </div>
      )}

      {/* ── Non-live footer ──────────────────────────────────────────────────── */}
      {!city.live && (
        <div
          className="px-5 py-2.5 text-[11px] border-t border-[rgba(222,219,200,0.06)] flex items-center gap-2"
          style={{ color: "rgba(225,224,204,0.32)" }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500/60 flex-shrink-0" />
          {selected} RAG dataset onboarding in progress \u2014 switch to{" "}
          <button
            className="underline underline-offset-2 hover:text-[rgba(225,224,204,0.6)] transition-colors"
            onClick={() => setSelected("Bengaluru Urban")}
          >
            Bengaluru Urban
          </button>{" "}
          for full AI Q&amp;A.
        </div>
      )}
    </div>
  );
}
