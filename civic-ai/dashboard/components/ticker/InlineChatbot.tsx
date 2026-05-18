"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ask } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const QUICK_QUESTIONS = [
  { label: "📋 Recent updates",  q: "What are the latest BBMP updates and announcements?" },
  { label: "⛽ Petrol price",    q: "What is the current petrol price in Bengaluru?" },
  { label: "🌤 Today's weather", q: "What is the weather like in Bengaluru today?" },
  { label: "📰 Latest news",     q: "What is the latest civic news for Bengaluru? Please respond in English." },
];

export default function InlineChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! Ask me anything about BBMP budgets, ward updates, civic policies, or city data. Try a quick question below ↓",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const data = await ask(trimmed, 4);
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't reach the backend right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#080808",
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "9px 14px",
          borderBottom: "1px solid rgba(222,219,200,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "rgba(74,222,128,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bot size={12} style={{ color: "#4ade80" }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#E1E0CC" }}>
          CIVIC AI Chat
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginLeft: 6,
            fontSize: 9.5,
            padding: "2px 7px",
            borderRadius: 20,
            background: "rgba(74,222,128,0.08)",
            color: "#4ade80",
            border: "1px solid rgba(74,222,128,0.18)",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#4ade80",
              boxShadow: "0 0 5px rgba(74,222,128,0.8)",
              display: "inline-block",
            }}
          />
          Live RAG
        </span>
        <span
          style={{
            fontSize: 9.5,
            color: "rgba(225,224,204,0.25)",
            marginLeft: "auto",
          }}
        >
          NVIDIA NIM · ChromaDB
        </span>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
            }}
          >
            {m.role === "assistant" && (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(74,222,128,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Bot size={11} style={{ color: "#4ade80" }} />
              </div>
            )}
            <div
              style={{
                maxWidth: "82%",
                padding: "8px 11px",
                borderRadius:
                  m.role === "user"
                    ? "12px 12px 3px 12px"
                    : "3px 12px 12px 12px",
                background:
                  m.role === "user"
                    ? "rgba(59,130,246,0.13)"
                    : "rgba(222,219,200,0.05)",
                border: `1px solid ${
                  m.role === "user"
                    ? "rgba(59,130,246,0.22)"
                    : "rgba(222,219,200,0.08)"
                }`,
                fontSize: 12,
                lineHeight: 1.6,
                color:
                  m.role === "user"
                    ? "#93c5fd"
                    : "rgba(225,224,204,0.80)",
                wordBreak: "break-word",
              }}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#E1E0CC" }}>{children}</p>,
                    h2: ({ children }) => <p style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 3, color: "#E1E0CC" }}>{children}</p>,
                    h3: ({ children }) => <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 2, color: "#E1E0CC" }}>{children}</p>,
                    p: ({ children }) => <p style={{ margin: "0 0 6px" }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: "0 0 6px", paddingLeft: 14 }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: "0 0 6px", paddingLeft: 14 }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "underline", wordBreak: "break-all" }}>{children}</a>,
                    strong: ({ children }) => <strong style={{ color: "#E1E0CC", fontWeight: 600 }}>{children}</strong>,
                    code: ({ children }) => <code style={{ background: "rgba(222,219,200,0.08)", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>{children}</code>,
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              ) : (
                m.text
              )}
            </div>
            {m.role === "user" && (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(59,130,246,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <User size={11} style={{ color: "#93c5fd" }} />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(74,222,128,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Bot size={11} style={{ color: "#4ade80" }} />
            </div>
            <div
              style={{
                padding: "9px 13px",
                borderRadius: "3px 12px 12px 12px",
                background: "rgba(222,219,200,0.05)",
                border: "1px solid rgba(222,219,200,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Loader2
                size={12}
                style={{ color: "#4ade80", animation: "spin 1s linear infinite" }}
                className="animate-spin"
              />
              <span style={{ fontSize: 11, color: "rgba(225,224,204,0.35)" }}>
                Thinking…
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick question chips ──────────────────────────────────────────── */}
      <div
        style={{
          padding: "7px 12px",
          borderTop: "1px solid rgba(222,219,200,0.06)",
          display: "flex",
          flexWrap: "wrap",
          gap: 5,
          flexShrink: 0,
        }}
      >
        {QUICK_QUESTIONS.map(({ label, q }) => (
          <button
            key={label}
            onClick={() => send(q)}
            disabled={loading}
            style={{
              fontSize: 10.5,
              padding: "4px 10px",
              borderRadius: 20,
              cursor: loading ? "not-allowed" : "pointer",
              background: "rgba(222,219,200,0.05)",
              color: "rgba(225,224,204,0.55)",
              border: "1px solid rgba(222,219,200,0.1)",
              transition: "all 0.15s",
              opacity: loading ? 0.45 : 1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "7px 10px 10px",
          borderTop: "1px solid rgba(222,219,200,0.06)",
          display: "flex",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask about BBMP, budgets, wards…"
          disabled={loading}
          style={{
            flex: 1,
            background: "rgba(222,219,200,0.05)",
            border: "1px solid rgba(222,219,200,0.1)",
            borderRadius: 10,
            padding: "7px 12px",
            fontSize: 12,
            color: "#E1E0CC",
            outline: "none",
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{
            width: 33,
            height: 33,
            borderRadius: 9,
            background:
              loading || !input.trim()
                ? "rgba(222,219,200,0.06)"
                : "rgba(59,130,246,0.7)",
            border: "1px solid rgba(222,219,200,0.08)",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          <Send
            size={13}
            style={{
              color:
                loading || !input.trim()
                  ? "rgba(225,224,204,0.2)"
                  : "#fff",
            }}
          />
        </button>
      </div>
    </div>
  );
}
