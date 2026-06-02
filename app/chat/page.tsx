"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string; streaming?: boolean };

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Grupo Banzai Veracruz";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("chat_session_id");
  if (!id) {
    id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("chat_session_id", id);
  }
  return id;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "¡Hola! 👋 Soy tu asistente. Puedo responder usando los archivos cargados por el administrador. ¿En qué puedo ayudarte?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  function scrollToBottom() {
    queueMicrotask(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  async function send() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setLoading(true);
    setMessages((m) => [...m, { role: "user", content: q }]);
    scrollToBottom();

    // Add an empty assistant message that we'll stream into
    setMessages((m) => [...m, { role: "assistant", content: "", streaming: true }]);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, sessionId: getSessionId(), stream: true }),
        signal: controller.signal
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const errorMsg = j.error || "No pude responder en este momento. Intenta de nuevo.";
        setMessages((m) => {
          const updated = [...m];
          updated[updated.length - 1] = { role: "assistant", content: errorMsg };
          return updated;
        });
        return;
      }

      // Check if it's a streaming response
      const contentType = r.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        // SSE streaming
        const reader = r.body?.getReader();
        if (!reader) throw new Error("No readable stream");
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "token" && event.content) {
                setMessages((m) => {
                  const updated = [...m];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.content
                  };
                  return updated;
                });
                scrollToBottom();
              } else if (event.type === "done") {
                if (event.escalated) setEscalated(true);
                setMessages((m) => {
                  const updated = [...m];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    streaming: false
                  };
                  return updated;
                });
              } else if (event.type === "error") {
                setMessages((m) => {
                  const updated = [...m];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: "No pude responder en este momento. Intenta de nuevo."
                  };
                  return updated;
                });
              }
            } catch {
              // Invalid JSON, skip
            }
          }
        }
      } else {
        // Non-streaming JSON response
        const j = await r.json();
        const a = j.ok ? String(j.answer ?? "") : "No pude responder en este momento.";
        if (j.escalated) setEscalated(true);
        setMessages((m) => {
          const updated = [...m];
          updated[updated.length - 1] = { role: "assistant", content: a };
          return updated;
        });
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages((m) => {
          const updated = [...m];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "No pude responder en este momento. Intenta de nuevo."
          };
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      scrollToBottom();
    }
  }

  function newConversation() {
    localStorage.removeItem("chat_session_id");
    setEscalated(false);
    setMessages([
      {
        role: "assistant",
        content:
          "¡Hola! 👋 Soy tu asistente. Puedo responder usando los archivos cargados por el administrador. ¿En qué puedo ayudarte?"
      }
    ]);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              AI
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">{APP_NAME}</h1>
              <p className="text-xs text-slate-500">
                Asistente de ventas — inventario de autos seminuevos
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={newConversation}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Nueva conversación
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="card flex flex-col h-[78vh] shadow-md">
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <Bubble key={idx} role={m.role} content={m.content} streaming={m.streaming} />
            ))}
            {loading && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl px-4 py-3 border border-slate-200">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {escalated && <HandoffForm sessionId={getSessionId()} />}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 p-3 bg-white rounded-b-xl">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Escriba su pregunta aquí…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) void send();
                  }
                }}
                disabled={loading}
              />
              <button
                className="btn-primary"
                onClick={() => void send()}
                disabled={!canSend}
              >
                <SendIcon />
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Tip: prueba &ldquo;¿Qué autos están disponibles?&rdquo; o &ldquo;¿Cuál es el precio del [modelo]?&rdquo;
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function HandoffForm({ sessionId }: { sessionId: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (sending) return;
    setSending(true);
    setErr("");
    try {
      const r = await fetch("/api/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, sessionId })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setErr(j.error || "No se pudo enviar. Intente de nuevo.");
        return;
      }
      setSent(true);
    } catch {
      setErr("No se pudo enviar. Intente de nuevo.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        ¡Gracias! Un asesor lo contactará pronto. 🙌
      </div>
    );
  }

  const canSend =
    name.trim().length > 0 && phone.replace(/\D/g, "").length >= 7 && !sending;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-900">
        Un asesor humano lo contactará pronto. Por favor déjenos su nombre y
        número de teléfono.
      </p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          className="input flex-1"
          placeholder="Su nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={sending}
        />
        <input
          className="input flex-1"
          placeholder="Su teléfono"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={sending}
        />
        <button className="btn-primary" onClick={() => void submit()} disabled={!canSend}>
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
    </div>
  );
}

function Bubble({ role, content, streaming }: { role: Msg["role"]; content: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap transition-all " +
          (isUser
            ? "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-sm"
            : "bg-white text-slate-800 border border-slate-200 shadow-sm")
        }
      >
        {content || (streaming ? "" : "...")}
        {streaming && content && <span className="inline-block w-1.5 h-4 bg-primary-500 ml-1 animate-pulse rounded-sm" />}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center py-1">
      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
