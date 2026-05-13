"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { MessageSquare, Clock } from "lucide-react";
import WordCloud from "@/components/WordCloud";
import { getRecentQuestions, type RecentQuestion } from "@/lib/api";

// Leaflet map — client-only (no SSR)
const BengaluruMap = dynamic(() => import("@/components/BengaluruMap"), { ssr: false });

interface ChunkRecord { name: string; chunks: number }

const DATA: ChunkRecord[] = [
  { name: "BBMP Budget XLSX",     chunks: 646 },
  { name: "Budget PDF (main)",    chunks: 437 },
  { name: "Karnataka Bill Policy",chunks: 197 },
  { name: "Budget PDF (annex)",   chunks: 38  },
  { name: "Ward CSV (92ec)",      chunks: 37  },
  { name: "Budget PDF (supp)",    chunks: 22  },
  { name: "Ward CSV (3bfa)",      chunks: 15  },
  { name: "Ward Meetings CSV",    chunks: 7   },
];

const KPI_CARDS = (totalIndexed: number) => [
  { label: "Total Chunks Indexed", value: totalIndexed.toLocaleString(), accent: true },
  { label: "Documents Ingested",   value: DATA.length.toString(),         accent: false },
  { label: "Unique Wards Covered", value: "198",                          accent: false },
  { label: "Budget Years Covered", value: "3",                            accent: false },
];

const cardVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function Analytics({ totalIndexed }: { totalIndexed: number }) {
  const [recentQs, setRecentQs] = useState<RecentQuestion[]>([]);

  useEffect(() => {
    getRecentQuestions().then(setRecentQs).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* ── KPI row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPI_CARDS(totalIndexed).map((kpi, i) => (
          <motion.div
            key={kpi.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-[rgba(222,219,200,0.1)] p-5"
            style={{ background: kpi.accent ? "rgba(222,219,200,0.07)" : "#101010" }}
          >
            <p className="text-[10px] font-medium uppercase tracking-widest mb-2"
               style={{ color: "rgba(225,224,204,0.45)" }}>
              {kpi.label}
            </p>
            <p className="text-3xl font-bold" style={{ color: "#E1E0CC" }}>
              {kpi.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Chunks per document bar chart ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="rounded-2xl border border-[rgba(222,219,200,0.08)] bg-[#101010] p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-4"
           style={{ color: "rgba(225,224,204,0.5)" }}>
          Chunks per Document
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={DATA} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(222,219,200,0.06)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "rgba(225,224,204,0.45)" }}
              angle={-30}
              textAnchor="end"
              interval={0}
              axisLine={{ stroke: "rgba(222,219,200,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "rgba(225,224,204,0.45)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid rgba(222,219,200,0.15)",
                borderRadius: 10,
                color: "#E1E0CC",
                fontSize: 12,
              }}
              formatter={(v) => [`${v} chunks`, "Chunks"]}
              cursor={{ fill: "rgba(222,219,200,0.04)" }}
            />
            <Bar dataKey="chunks" radius={[4, 4, 0, 0]}>
              {DATA.map((_, i) => (
                <Cell
                  key={i}
                  fill={`rgba(222,219,200,${0.25 + (i % 4) * 0.15})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── Word cloud + Map row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <p className="text-[10px] font-medium uppercase tracking-widest mb-3"
             style={{ color: "rgba(225,224,204,0.45)" }}>
            Keyword Word Cloud
          </p>
          <WordCloud />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <p className="text-[10px] font-medium uppercase tracking-widest mb-3"
             style={{ color: "rgba(225,224,204,0.45)" }}>
            Bengaluru Civic Map
          </p>
          <BengaluruMap />
        </motion.div>
      </div>

      {/* ── Recent Questions ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="rounded-2xl border border-[rgba(222,219,200,0.08)] bg-[#101010] p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-3.5 w-3.5" style={{ color: "rgba(225,224,204,0.45)" }} />
          <p className="text-[10px] font-medium uppercase tracking-widest"
             style={{ color: "rgba(225,224,204,0.45)" }}>
            Recent Questions
          </p>
        </div>

        {recentQs.length === 0 ? (
          <p className="text-xs" style={{ color: "rgba(225,224,204,0.3)" }}>
            No questions asked yet.
          </p>
        ) : (
          <div className="space-y-2">
            {recentQs.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.06, duration: 0.3 }}
                className="flex items-start gap-3 rounded-xl px-4 py-3 border"
                style={{
                  background: "rgba(222,219,200,0.03)",
                  borderColor: "rgba(222,219,200,0.08)",
                }}
              >
                <span
                  className="shrink-0 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5"
                  style={{ background: "rgba(222,219,200,0.12)", color: "#DEDBC8" }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug truncate" style={{ color: "#E1E0CC" }}>
                    {q.question}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-3 w-3" style={{ color: "rgba(225,224,204,0.3)" }} />
                    <span className="text-[10px]" style={{ color: "rgba(225,224,204,0.3)" }}>
                      {q.asked_by} · {new Date(q.asked_at + "Z").toLocaleString("en-IN", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

