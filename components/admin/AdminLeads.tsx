"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Lead = {
  id: string;
  session_id: string | null;
  name: string;
  phone: string;
  created_at: string;
};

export function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/leads")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setLeads(j.leads);
        else setErr(j.error || "Error al cargar los leads.");
      })
      .catch(() => setErr("Error al cargar los leads."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-semibold">
              AI
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">
                Leads / Solicitudes de contacto
              </div>
              <div className="text-xs text-slate-500">
                Clientes que pidieron hablar con un asesor
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Panel
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Chat
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Leads capturados</h1>
          <p className="mt-1 text-sm text-slate-600">
            Personas que solicitaron ser contactadas por un asesor humano,
            más recientes primero.
          </p>
        </div>

        <div className="card p-5">
          {loading ? (
            <div className="text-sm text-slate-500">Cargando leads...</div>
          ) : err ? (
            <div className="text-sm text-rose-500">{err}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 font-medium">Sesión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-slate-500 text-center">
                        Aún no hay solicitudes de contacto.
                      </td>
                    </tr>
                  ) : (
                    leads.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(l.created_at).toLocaleString("es-MX", {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium">{l.name}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <a
                            href={`tel:${l.phone.replace(/\s/g, "")}`}
                            className="text-primary-700 hover:underline"
                          >
                            {l.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                          {l.session_id ? l.session_id.slice(0, 12) + "…" : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
