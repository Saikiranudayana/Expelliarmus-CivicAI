// Central API client — all calls go through here so the base URL is configured once.
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const api = axios.create({ baseURL: BASE, timeout: 120_000 });

// Attach JWT + localtunnel bypass header on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("civic_ai_token");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
  }
  // Required when backend is exposed via localtunnel (skips the password page)
  config.headers["bypass-tunnel-reminder"] = "true";
  return config;
});

// Clear expired token and reload to login screen on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("civic_ai_token");
      localStorage.removeItem("civic_ai_role");
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// ── Types ────────────────────────────────────────────────────────────────────

export interface Citation {
  source: string;
  chunk_index: number;
  text: string;
  score: number;
}

export interface AskResponse {
  answer: string;          // structured Markdown
  citations: Citation[];
  web_sources: string[];   // Tavily web source URLs
}

export interface StatsResponse {
  collection: string;
  total_indexed: number;
}

export interface IngestResponse {
  filename: string;
  chunks_added: number;
  total_indexed: number;
}

export interface NotifyRequest {
  filename: string;
  chunks_added: number;
  summary?: string;
}

export interface NotifyResponse {
  sent_to: number;
  message: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  ward: string | null;
  created_at: string;
  created_by: string;
}

export interface MeetingCreate {
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string;
  ward?: string;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  role: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  const { data } = await api.post("/auth/token", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return { access_token: data.access_token as string, role: data.role as string };
}

export async function ask(question: string, top_k = 5): Promise<AskResponse> {
  const { data } = await api.post<AskResponse>("/ask", { question, top_k, use_web_search: true });
  return data;
}

export async function getStats(): Promise<StatsResponse> {
  const { data } = await api.get<StatsResponse>("/ingest/stats");
  return data;
}

export async function ingestFile(file: File): Promise<IngestResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<IngestResponse>("/ingest/file", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function notifySubscribers(body: NotifyRequest): Promise<NotifyResponse> {
  const { data } = await api.post<NotifyResponse>("/ingest/notify", body);
  return data;
}

// ── Meetings ─────────────────────────────────────────────────────────────────

export async function getMeetings(): Promise<Meeting[]> {
  const { data } = await api.get<Meeting[]>("/meetings");
  return data;
}

export async function createMeeting(body: MeetingCreate): Promise<Meeting> {
  const { data } = await api.post<Meeting>("/meetings", body);
  return data;
}

export async function deleteMeeting(id: string): Promise<void> {
  await api.delete(`/meetings/${id}`);
}

export async function notifyMeeting(id: string): Promise<NotifyResponse> {
  const { data } = await api.post<NotifyResponse>(`/meetings/${id}/notify`);
  return data;
}

// ── Subscribers ───────────────────────────────────────────────────────────────

export interface SubscriberOut {
  phone: string;
  total: number;
}

export interface SubscriberListResponse {
  subscribers: string[];
  total: number;
}

/** Open endpoint — no login needed. Phone in E.164 format e.g. "919876543210" */
export async function registerSubscriber(phone: string): Promise<SubscriberOut> {
  const { data } = await api.post<SubscriberOut>("/subscribers", { phone });
  return data;
}

/** Organizer only */
export async function listSubscribers(): Promise<SubscriberListResponse> {
  const { data } = await api.get<SubscriberListResponse>("/subscribers");
  return data;
}

/** Organizer only */
export async function removeSubscriber(phone: string): Promise<{ removed: string; total: number }> {
  const { data } = await api.delete(`/subscribers/${phone}`);
  return data;
}

/** Send a custom message to all subscribers — organizer only */
export async function broadcastToSubscribers(
  message: string,
): Promise<{ sent: number; failed: number; total: number; detail?: string }> {
  const { data } = await api.post("/subscribers/broadcast", { message });
  return data;
}

// ── Recent Questions ──────────────────────────────────────────────────────────

export interface RecentQuestion {
  question: string;
  asked_by: string;
  asked_at: string;
}

export async function getRecentQuestions(): Promise<RecentQuestion[]> {
  const { data } = await api.get<{ questions: RecentQuestion[] }>("/ask/recent");
  return data.questions;
}
