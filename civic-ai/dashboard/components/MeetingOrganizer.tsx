"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Plus, Trash2, Send, Loader2,
  MapPin, Clock, MessageCircle, CheckCircle, AlertCircle,
} from "lucide-react";
import {
  getMeetings, createMeeting, deleteMeeting, notifyMeeting,
  type Meeting,
} from "@/lib/api";

/* ── Form state type ─────────────────────────────────────────────────────── */
interface MeetingForm {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  ward: string;
}

const EMPTY_FORM: MeetingForm = {
  title: "", date: "", time: "", location: "", description: "", ward: "",
};

/* ── Meeting card ────────────────────────────────────────────────────────── */
function MeetingCard({
  meeting,
  onDelete,
  onNotify,
}: {
  meeting: Meeting;
  onDelete: () => void;
  onNotify: () => Promise<{ message?: string }>;
}) {
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [notifyMsg, setNotifyMsg]       = useState("");
  const [deleting, setDeleting]         = useState(false);

  async function handleNotify() {
    setNotifyStatus("sending");
    try {
      const res = await onNotify();
      setNotifyMsg(res?.message ?? "Notifications sent.");
      setNotifyStatus("done");
    } catch (e: unknown) {
      setNotifyMsg(e instanceof Error ? e.message : "Failed to notify.");
      setNotifyStatus("error");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(); } catch { setDeleting(false); }
  }

  const isUpcoming = new Date(`${meeting.date}T${meeting.time || "00:00"}`) >= new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-[rgba(222,219,200,0.1)] bg-[#101010] p-5 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isUpcoming && (
              <span
                className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                style={{ color: "#DEDBC8", borderColor: "rgba(222,219,200,0.25)", background: "rgba(222,219,200,0.06)" }}
              >
                Upcoming
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm truncate" style={{ color: "#E1E0CC" }}>
            {meeting.title}
          </h3>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 p-1.5 rounded-lg border border-[rgba(222,219,200,0.08)] hover:border-red-800/50 hover:bg-red-950/20 transition-all disabled:opacity-40"
        >
          {deleting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
            : <Trash2 className="h-3.5 w-3.5" style={{ color: "rgba(225,224,204,0.4)" }} />}
        </button>
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3 shrink-0" style={{ color: "rgba(225,224,204,0.4)" }} />
          <span className="text-xs" style={{ color: "rgba(225,224,204,0.6)" }}>{meeting.date}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0" style={{ color: "rgba(225,224,204,0.4)" }} />
          <span className="text-xs" style={{ color: "rgba(225,224,204,0.6)" }}>{meeting.time}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0" style={{ color: "rgba(225,224,204,0.4)" }} />
          <span className="text-xs truncate max-w-[180px]" style={{ color: "rgba(225,224,204,0.6)" }}>{meeting.location}</span>
        </div>
        {meeting.ward && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-[rgba(222,219,200,0.1)]" style={{ color: "rgba(225,224,204,0.45)" }}>
            Ward: {meeting.ward}
          </span>
        )}
      </div>

      {meeting.description && (
        <p className="text-xs leading-relaxed" style={{ color: "rgba(225,224,204,0.5)" }}>
          {meeting.description}
        </p>
      )}

      {/* Notify button */}
      <div className="pt-1 border-t border-[rgba(222,219,200,0.06)] flex items-center justify-between gap-3">
        {notifyStatus === "idle" || notifyStatus === "sending" ? (
          <button
            onClick={handleNotify}
            disabled={notifyStatus === "sending"}
            className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 border border-[rgba(222,219,200,0.12)] hover:border-[rgba(222,219,200,0.3)] transition-all disabled:opacity-50"
            style={{ color: "rgba(225,224,204,0.7)" }}
          >
            {notifyStatus === "sending"
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <MessageCircle className="h-3 w-3" />}
            {notifyStatus === "sending" ? "Sending…" : "Notify via WhatsApp"}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5"
          >
            {notifyStatus === "done"
              ? <CheckCircle className="h-3.5 w-3.5" style={{ color: "rgba(222,219,200,0.7)" }} />
              : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
            <span className="text-xs" style={{ color: notifyStatus === "done" ? "rgba(222,219,200,0.6)" : "#f87171" }}>
              {notifyMsg}
            </span>
          </motion.div>
        )}
        <span className="text-[10px]" style={{ color: "rgba(225,224,204,0.25)" }}>
          by {meeting.created_by}
        </span>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════════════ */
export default function MeetingOrganizer() {
  const [meetings, setMeetings]   = useState<Meeting[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState<MeetingForm>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  async function loadMeetings() {
    setLoading(true);
    try {
      const data = await getMeetings();
      setMeetings(data);
    } catch {
      // organizer-only read; silently fail if token missing
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMeetings(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await createMeeting(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadMeetings();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create meeting.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteMeeting(id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleNotify(id: string) {
    return notifyMeeting(id);
  }

  const inputClass =
    "w-full bg-[#1a1a1a] border border-[rgba(222,219,200,0.1)] rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[rgba(222,219,200,0.3)] transition-colors placeholder:opacity-40";
  const inputStyle = { color: "#E1E0CC" };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all"
          style={{ background: showForm ? "rgba(222,219,200,0.1)" : "#DEDBC8", color: showForm ? "#E1E0CC" : "#000" }}
        >
          <Plus className={`h-3.5 w-3.5 transition-transform ${showForm ? "rotate-45" : ""}`} />
          {showForm ? "Cancel" : "Add Meeting"}
        </button>
      </div>

      {/* ── Create form ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleCreate}
              className="rounded-2xl border border-[rgba(222,219,200,0.12)] bg-[#101010] p-5 space-y-3"
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-4"
                 style={{ color: "rgba(225,224,204,0.5)" }}>
                New Meeting
              </p>

              <input
                required
                className={inputClass}
                style={inputStyle}
                placeholder="Meeting title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="date"
                  className={inputClass}
                  style={inputStyle}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <input
                  required
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Time (e.g. 10:00 AM) *"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>

              <input
                required
                className={inputClass}
                style={inputStyle}
                placeholder="Location *"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />

              <input
                className={inputClass}
                style={inputStyle}
                placeholder="Ward (optional, e.g. Koramangala 5th Block)"
                value={form.ward}
                onChange={(e) => setForm({ ...form, ward: e.target.value })}
              />

              <textarea
                className={`${inputClass} resize-none`}
                style={inputStyle}
                placeholder="Description / agenda (optional)"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              {formError && (
                <p className="text-xs text-red-400">{formError}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: "#DEDBC8", color: "#000" }}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarDays className="h-3.5 w-3.5" />}
                {saving ? "Saving…" : "Create Meeting"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Meeting list ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#101010] border border-[rgba(222,219,200,0.06)] animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-2xl border border-[rgba(222,219,200,0.06)] bg-[#101010] p-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-8 w-8" style={{ color: "rgba(225,224,204,0.2)" }} />
          <p className="text-sm" style={{ color: "rgba(225,224,204,0.4)" }}>No meetings scheduled yet.</p>
          <p className="text-xs mt-1" style={{ color: "rgba(225,224,204,0.25)" }}>
            Click <em>Add Meeting</em> above to schedule one and notify subscribers.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {meetings.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                onDelete={() => handleDelete(m.id)}
                onNotify={() => handleNotify(m.id)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
