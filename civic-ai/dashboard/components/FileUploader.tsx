"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { UploadCloud, CheckCircle, XCircle, Loader2, Send, MessageCircle } from "lucide-react";
import { ingestFile, notifySubscribers, type IngestResponse } from "@/lib/api";

interface Props {
  onSuccess?: (result: IngestResponse) => void;
}

export default function FileUploader({ onSuccess }: Props) {
  const [status, setStatus]       = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult]       = useState<IngestResponse | null>(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [summary, setSummary]     = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [notifyMsg, setNotifyMsg] = useState("");

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return;
    const file = accepted[0];
    setStatus("uploading");
    setResult(null);
    setErrorMsg("");
    setNotifyStatus("idle");
    setSummary("");
    try {
      const res = await ingestFile(file);
      setResult(res);
      setStatus("done");
      onSuccess?.(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed. Check server logs.";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
  });

  async function handleNotify() {
    if (!result) return;
    setNotifyStatus("sending");
    try {
      const res = await notifySubscribers({
        filename:     result.filename,
        chunks_added: result.chunks_added,
        summary,
      });
      setNotifyMsg(res.message);
      setNotifyStatus("sent");
    } catch (err: unknown) {
      setNotifyMsg(err instanceof Error ? err.message : "Failed to send notifications.");
      setNotifyStatus("error");
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Drop zone ──────────────────────────────────────────────────── */}
      <div
        {...getRootProps()}
        className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all"
        style={{
          borderColor:     isDragActive ? "rgba(222,219,200,0.5)" : "rgba(222,219,200,0.15)",
          background:      isDragActive ? "rgba(222,219,200,0.04)" : "transparent",
        }}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className="mx-auto mb-3 h-10 w-10"
          style={{ color: isDragActive ? "#E1E0CC" : "rgba(225,224,204,0.3)" }}
        />
        {isDragActive ? (
          <p className="font-medium text-sm" style={{ color: "#E1E0CC" }}>Drop to ingest…</p>
        ) : (
          <>
            <p className="font-medium text-sm" style={{ color: "rgba(225,224,204,0.7)" }}>
              Drag &amp; drop a document here
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(225,224,204,0.35)" }}>
              or click to browse — PDF, CSV, XLSX
            </p>
          </>
        )}
      </div>

      {/* ── Uploading ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {status === "uploading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-xs"
            style={{ color: "rgba(225,224,204,0.6)" }}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Chunking, embedding, indexing…
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success + WhatsApp notify ──────────────────────────────────── */}
      <AnimatePresence>
        {status === "done" && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            {/* Ingest success card */}
            <div className="flex items-start gap-3 rounded-2xl border border-[rgba(222,219,200,0.12)] bg-[#101010] p-5">
              <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "#DEDBC8" }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "#E1E0CC" }}>{result.filename}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(225,224,204,0.5)" }}>
                  +{result.chunks_added} chunks added · {result.total_indexed} total indexed
                </p>
              </div>
            </div>

            {/* WhatsApp summary notification panel */}
            <div className="rounded-2xl border border-[rgba(222,219,200,0.08)] bg-[#101010] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" style={{ color: "rgba(225,224,204,0.5)" }} />
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "rgba(225,224,204,0.5)" }}>
                  Notify WhatsApp Subscribers
                </p>
              </div>
              <p className="text-xs" style={{ color: "rgba(225,224,204,0.4)" }}>
                Optionally add a summary to send to all registered subscribers along with the file info.
              </p>
              <textarea
                className="w-full bg-[#1a1a1a] border border-[rgba(222,219,200,0.1)] rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[rgba(222,219,200,0.3)] transition-colors resize-none"
                style={{ color: "#E1E0CC" }}
                placeholder="Optional summary (e.g. 'This document covers the Q3 2025 ward budget allocations for Koramangala zone…')"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={notifyStatus === "sending" || notifyStatus === "sent"}
              />

              {notifyStatus !== "sent" && (
                <button
                  onClick={handleNotify}
                  disabled={notifyStatus === "sending"}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                  style={{ background: "#DEDBC8", color: "#000" }}
                >
                  {notifyStatus === "sending"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />}
                  {notifyStatus === "sending" ? "Sending…" : "Send Summary to Subscribers"}
                </button>
              )}

              {(notifyStatus === "sent" || notifyStatus === "error") && notifyMsg && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs"
                  style={{ color: notifyStatus === "sent" ? "rgba(222,219,200,0.7)" : "#f87171" }}
                >
                  {notifyMsg}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-2xl border border-red-800/30 bg-red-950/20 p-4"
          >
            <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
