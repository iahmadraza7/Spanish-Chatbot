"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { AdminFiles } from "@/components/admin/AdminFiles";

type TabKey = "documentos" | "estadisticas" | "prompt";

export function AdminDashboard() {
  const [tab, setTab] = useState<TabKey>("documentos");

  const tabs = useMemo(
    () =>
      [
        { key: "documentos", label: "Documentos" },
        { key: "estadisticas", label: "Estadísticas" },
        { key: "prompt", label: "Editor de prompt" }
      ] as const,
    []
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <TopBar />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">
            Panel de administración
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Administra la base de conocimiento del chatbot cargando archivos del
            negocio.
          </p>
        </div>

        <div className="border-b border-slate-200">
          <nav className="flex gap-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  "relative pb-3 text-sm font-medium " +
                  (tab === t.key
                    ? "text-primary-700"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                {t.label}
                {tab === t.key && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary-600" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {tab === "documentos" && <AdminFiles variant="dashboard" />}
          {tab === "estadisticas" && <StatsDashboard />}
          {tab === "prompt" && <PromptEditor />}
        </div>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-semibold">
            AI
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">
              RAG Assistant
            </div>
            <div className="text-xs text-slate-500">
              MVP — Chatbot en español
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Chat
          </Link>
          <form action="/api/auth/logout" method="post">
            <button className="btn-primary" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function StatsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setStats(j.stats);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Cargando estadísticas...</div>;
  }
  if (!stats) {
    return <div className="p-6 text-sm text-rose-500">Error al cargar estadísticas.</div>;
  }

  const { totalFiles, totalChunks, totalMessages, messagesToday, escalatedCount, recentQuestions, topFiles, dailyUsage } = stats;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Archivos indexados" value={totalFiles} sub={`${totalChunks} chunks generados`} />
        <StatCard title="Mensajes totales" value={totalMessages} sub="Historial completo" />
        <StatCard title="Mensajes hoy" value={messagesToday} sub="Últimas 24hrs" />
        <StatCard title="Derivaciones" value={escalatedCount} sub="A agente humano" alert={escalatedCount > 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">Uso últimos 7 días</h2>
          <div className="h-40 flex items-end gap-2 pb-2">
            {dailyUsage.length === 0 ? (
              <div className="text-xs text-slate-400 w-full text-center my-auto">Sin datos</div>
            ) : (
              dailyUsage.map((d: any, i: number) => {
                const max = Math.max(...dailyUsage.map((x: any) => x.count), 10);
                const pct = Math.max((d.count / max) * 100, 5);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-primary-100 rounded-t-sm relative group">
                      <div className="absolute bottom-0 w-full bg-primary-500 rounded-t-sm transition-all" style={{ height: `${pct}%` }} />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                        {d.count} msgs
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate w-full text-center">
                      {new Date(d.day).toLocaleDateString("es-ES", { weekday: "short" })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">Archivos más consultados</h2>
          <div className="space-y-3">
            {topFiles.length === 0 ? (
              <div className="text-xs text-slate-400">Sin datos suficientes</div>
            ) : (
              topFiles.map((f: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="truncate text-slate-600 mr-4 font-medium">{f.name}</div>
                  <div className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">{f.count} citas</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-4">Últimas preguntas de usuarios</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Pregunta</th>
                <th className="px-4 py-3 font-medium">Sesión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentQuestions.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-4 text-slate-500 text-center">Sin preguntas recientes</td></tr>
              ) : (
                recentQuestions.map((q: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(q.created_at).toLocaleString("es-ES", { month: "short", day: "numeric", hour: "2-digit", minute:"2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{q.content}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{q.session_id.slice(0, 10)}...</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, alert }: { title: string, value: number, sub: string, alert?: boolean }) {
  return (
    <div className={`card p-5 border-l-4 ${alert ? "border-l-rose-500" : "border-l-primary-500"}`}>
      <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider">{title}</h3>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString()}</div>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function PromptEditor() {
  const [prompt, setPrompt] = useState("");
  const [original, setOriginal] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/prompt")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setPrompt(j.prompt);
          setOriginal(j.prompt);
          setUpdatedAt(j.updatedAt);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const r = await fetch("/api/admin/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error al guardar");
      setOriginal(prompt);
      setUpdatedAt(j.updatedAt);
      setMsg("Prompt guardado correctamente. Los cambios ya están activos.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Cargando editor...</div>;

  const hasChanges = prompt !== original;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Prompt del Sistema (Personalidad)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Instrucciones base que el modelo de IA seguirá antes de responder preguntas.
            Define el tono, las reglas del negocio y el formato de las respuestas.
          </p>
        </div>
        {updatedAt && (
          <div className="text-xs text-slate-400 text-right">
            Última modif:<br/>
            {new Date(updatedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        )}
      </div>

      {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</div>}
      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</div>}

      <div className="relative">
        <textarea
          className="input w-full font-mono text-sm leading-6 min-h-[400px] resize-y p-4 bg-slate-50"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={saving}
          spellCheck={false}
        />
        <div className="absolute top-3 right-3 flex gap-2">
           <button
            onClick={() => setPrompt(original)}
            disabled={!hasChanges || saving}
            className="text-xs bg-white text-slate-500 border border-slate-300 px-3 py-1 rounded hover:bg-slate-50 disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="text-xs bg-primary-600 text-white px-3 py-1 rounded shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
      
      <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
        <strong>Recomendación:</strong> Mantén las instrucciones para que la IA responda <code>"No encontré esa información"</code> si necesitas evitar respuestas inventadas (alucinaciones).
      </div>
    </div>
  );
}

