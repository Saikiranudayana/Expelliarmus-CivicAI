"use client";

/**
 * MarketTicker — top-of-page scrolling financial data bar.
 *
 * Design mirrors the reference screenshot:
 *   ● Market Open | Gold (24K) ₹9,485 ▼ ₹52 (-0.55%) · Petrol ₹94.72 · – ·
 *                   Diesel ₹87.62 · – · USD/INR ₹84.23 · – · Sensex 82,450 ▲ ...
 *
 * Data comes from GET /market (backend). Refreshes every 5 minutes.
 * Hover pauses the scroll animation.
 */

import { cloneElement, type ReactElement } from "react";
import useSWR from "swr";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketData {
  gold_per_gram: number;
  gold_change_pct: number;
  gold_change_abs: number;
  petrol_delhi: number;
  diesel_delhi: number;
  usd_inr: number;
  sensex: number;
  sensex_change_pct: number;
  data_note: string;
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchMarket(): Promise<MarketData> {
  const res = await fetch(`${BASE}/market`, {
    headers: { "bypass-tunnel-reminder": "true" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`/market ${res.status}`);
  return res.json() as Promise<MarketData>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 2): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

// ── A single ticker item ───────────────────────────────────────────────────────

function Item({
  label,
  value,
  change,
  changePct,
}: {
  label: string;
  value: string;
  change?: number;
  changePct?: number;
}) {
  const up = change !== undefined ? change >= 0 : changePct !== undefined ? changePct >= 0 : null;
  const changeColor = up === null ? undefined : up ? "#22c55e" : "#f87171";
  const arrow = up === null ? null : up ? "▲" : "▼";

  return (
    <span className="flex items-center gap-2 whitespace-nowrap px-5 text-[12px]">
      {/* Label */}
      <span style={{ color: "rgba(225,224,204,0.55)" }}>{label}</span>

      {/* Value */}
      <span className="font-semibold" style={{ color: "#E1E0CC" }}>
        ₹{value}
      </span>

      {/* Change */}
      {arrow !== null && change !== undefined && changePct !== undefined && (
        <span className="flex items-center gap-1 font-medium" style={{ color: changeColor }}>
          {arrow}
          <span>₹{Math.abs(change).toLocaleString("en-IN")}</span>
          <span>({changePct > 0 ? "+" : ""}{fmt(changePct, 2)}%)</span>
        </span>
      )}

      {/* If only pct change (no absolute) */}
      {arrow !== null && change === undefined && changePct !== undefined && (
        <span className="font-medium" style={{ color: changeColor }}>
          {arrow} {changePct > 0 ? "+" : ""}{fmt(changePct, 2)}%
        </span>
      )}
    </span>
  );
}

// Separator dot between items
function Dot() {
  return (
    <span
      className="px-1 select-none text-[rgba(222,219,200,0.2)]"
      aria-hidden
    >
      ·
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex h-9 w-full items-center bg-[#080808] border-b border-[rgba(222,219,200,0.07)] px-4">
      <span className="flex items-center gap-1.5 mr-5">
        <span className="h-2 w-2 rounded-full bg-[rgba(222,219,200,0.15)]" />
        <span className="h-2 w-20 rounded bg-[rgba(222,219,200,0.1)] animate-pulse" />
      </span>
      <span className="h-2 w-64 rounded bg-[rgba(222,219,200,0.07)] animate-pulse" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MarketTicker() {
  const { data, isLoading, error } = useSWR<MarketData>("/market", fetchMarket, {
    refreshInterval: 5 * 60_000,   // refresh every 5 minutes
    revalidateOnFocus: false,
    shouldRetryOnError: true,
    errorRetryCount: 3,
  });

  if (isLoading) return <Skeleton />;

  // On error: show an offline bar that still has the right height
  if (error || !data) {
    return (
      <div className="flex h-9 w-full items-center bg-[#080808] border-b border-[rgba(222,219,200,0.07)] px-4">
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(225,224,204,0.3)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-[rgba(222,219,200,0.2)]" />
          Market data unavailable
        </span>
      </div>
    );
  }

  // Build the list of items once, then duplicate for seamless loop
  const items: React.ReactNode[] = [
    <Item
      key="gold"
      label="Gold (24K)"
      value={data.gold_per_gram.toLocaleString("en-IN")}
      change={data.gold_change_abs}
      changePct={data.gold_change_pct}
    />,
    <Dot key="d1" />,
    <Item key="petrol" label="Petrol" value={fmt(data.petrol_delhi)} />,
    <Dot key="d2" />,
    <Item key="diesel" label="Diesel" value={fmt(data.diesel_delhi)} />,
    <Dot key="d3" />,
    <Item
      key="usd"
      label="USD/INR"
      value={fmt(data.usd_inr)}
    />,
    <Dot key="d4" />,
    <Item
      key="sensex"
      label="Sensex"
      value={data.sensex.toLocaleString("en-IN")}
      changePct={data.sensex_change_pct}
    />,
    <Dot key="d5" />,
  ];

  // Duplicate for seamless CSS infinite scroll — give the second set distinct keys
  const allItems = [
    ...items,
    ...items.map((item, i) =>
      cloneElement(item as ReactElement, { key: `loop-${i}` })
    ),
  ];

  return (
    <div className="relative flex h-9 w-full items-center overflow-hidden bg-[#080808] border-b border-[rgba(222,219,200,0.07)]">

      {/* ── Left: fixed status pill ─────────────────────────────────── */}
      <div className="relative z-10 flex shrink-0 items-center pl-4 pr-4 border-r border-[rgba(222,219,200,0.08)] bg-[#080808] h-full">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-green-600 rounded-sm px-2.5 py-0.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
          Market Open
        </span>
      </div>

      {/* ── Right: scrolling track ────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track flex items-center">
          {allItems}
        </div>
      </div>

      {/* ── Far-right: cadence hint ───────────────────────────────── */}
      <div
        className="relative z-10 hidden md:flex shrink-0 items-center pl-4 pr-4 border-l border-[rgba(222,219,200,0.06)] bg-[#080808] h-full text-[10px] italic"
        style={{ color: "rgba(225,224,204,0.25)" }}
        title={data.data_note}
      >
        Refreshes vary — hover to pause
      </div>
    </div>
  );
}
