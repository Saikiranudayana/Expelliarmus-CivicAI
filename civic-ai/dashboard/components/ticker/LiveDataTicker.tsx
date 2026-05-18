"use client";

/**
 * civic-ai/dashboard/components/ticker/LiveDataTicker.tsx
 *
 * Polls GET {NEXT_PUBLIC_API_URL}/stats every 60 seconds via SWR.
 * Renders a horizontally infinite CSS-scrolling ticker bar pinned to the
 * very top of the page — above any navbar.
 *
 * Behaviour:
 *  - Shows a skeleton/loading state on first fetch
 *  - Collapses to just the "○ Offline" pill on network error
 *  - Scroll pauses on hover (CSS animation-play-state: paused)
 *  - Mobile-first: minimum 375 px viewport supported
 */

import useSWR from "swr";
import TickerItem from "./TickerItem";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlatformStats {
  documents_ingested: number;
  queries_today: number;
  avg_response_ms: number | null;
  latest_headline: string | null;
  last_refresh_ts: number;
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchStats(): Promise<PlatformStats> {
  const res = await fetch(`${BASE}/stats`, {
    headers: { "bypass-tunnel-reminder": "true" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`/stats returned ${res.status}`);
  return res.json() as Promise<PlatformStats>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRefreshAge(ts: number): string {
  const ageSec = Math.round(Date.now() / 1000 - ts);
  if (ageSec < 60) return "just now";
  const ageMin = Math.round(ageSec / 60);
  return `${ageMin} min ago`;
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ online }: { online: boolean }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1.5 px-3 text-xs font-semibold"
      aria-label={online ? "Backend online" : "Backend offline"}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          online ? "bg-green-400 shadow-[0_0_4px_1px_rgba(74,222,128,0.6)]" : "bg-[rgba(222,219,200,0.3)]"
        }`}
      />
      <span className={online ? "text-green-400" : "text-[rgba(222,219,200,0.4)]"}>
        {online ? "Live" : "Offline"}
      </span>
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TickerSkeleton() {
  return (
    <div
      className="flex h-8 w-full items-center border-b border-[rgba(222,219,200,0.08)] bg-[#0c0c0c] px-3"
      aria-busy="true"
      aria-label="Loading live data"
    >
      <StatusPill online={false} />
      <div className="ml-3 h-2 w-48 animate-pulse rounded bg-[rgba(222,219,200,0.1)]" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LiveDataTicker() {
  const { data, error, isLoading } = useSWR<PlatformStats>(
    "/stats",
    fetchStats,
    {
      refreshInterval: 60_000,      // re-fetch every 60 seconds
      revalidateOnFocus: false,
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  // First load — show skeleton
  if (isLoading) return <TickerSkeleton />;

  // Error state — collapse to offline pill only (never crashes the page)
  if (error || !data) {
    return (
      <div
        className="flex h-8 w-full items-center border-b border-[rgba(222,219,200,0.08)] bg-[#0c0c0c]"
        role="status"
      >
        <StatusPill online={false} />
      </div>
    );
  }

  // Build ticker items
  const items: Array<{
    icon: string;
    label: string;
    value: string;
    href?: string;
  }> = [
    {
      icon: "📄",
      label: "Documents Ingested",
      value: String(data.documents_ingested),
    },
    {
      icon: "🔍",
      label: "Queries Today",
      value: String(data.queries_today),
    },
    ...(data.avg_response_ms != null
      ? [
          {
            icon: "⏱",
            label: "Avg Response",
            value: `${(data.avg_response_ms / 1000).toFixed(1)}s`,
          },
        ]
      : []),
    ...(data.latest_headline
      ? [
          {
            icon: "📰",
            label: "Latest",
            value: data.latest_headline,
            href: "https://pib.gov.in",
          },
        ]
      : []),
    {
      icon: "🕐",
      label: "Last Refresh",
      value: formatRefreshAge(data.last_refresh_ts),
    },
  ];

  // Duplicate items so the CSS scroll looks seamless (infinite loop)
  const allItems = [...items, ...items];

  return (
    <div
      className="relative flex h-8 w-full items-center overflow-hidden border-b border-[rgba(222,219,200,0.08)] bg-[#0c0c0c]"
      role="marquee"
      aria-label="Live civic platform stats"
    >
      {/* Left: fixed status pill */}
      <div className="relative z-10 flex shrink-0 items-center border-r border-[rgba(222,219,200,0.08)] bg-[#0c0c0c] pr-1">
        <StatusPill online={true} />
      </div>

      {/* Right: scrolling track */}
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        <div className="ticker-track">
          {allItems.map((item, idx) => (
            <span key={idx} className="flex items-center">
              <TickerItem
                icon={item.icon}
                label={item.label}
                value={item.value}
                href={item.href}
              />
              {/* separator dot */}
              <span
                className="px-1 text-[rgba(222,219,200,0.25)] select-none"
                aria-hidden="true"
              >
                ·
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
