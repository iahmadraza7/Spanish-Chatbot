"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type FileRow = {
  id: string;
  original_name: string;
  mime_type: string;
  ext: string;
  size_bytes: number;
  uploaded_at: string;
  status: "uploaded" | "processing" | "ready" | "error";
  error_message?: string | null;
};

type FileDetail = {
  id: string;
  original_name: string;
  ext: string;
  uploaded_at: string;
  status: string;
  error_message?: string | null;
  preview_text?: string | null;
};

export function AdminFiles({ variant = "default" }: { variant?: "default" | "dashboard" }) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FileDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const selectedRow = useMemo(
    () => files.find((f) => f.id === selectedId) ?? null,
    [files, selectedId]
  );

  async function refresh() {
    const r = await fetch("/api/files", { cache: "no-store" });
    const j = await r.json();
    setFiles(j.files ?? []);
    if (!selectedId && (j.files?.[0]?.id as string | undefined)) {
      setSelectedId(j.files[0].id);
    }
  }

  async function loadDetail(id: string) {
    const r = await fetch(`/api/files/${id}`, { cache: "no-store" });
    const j = await r.json();
    setDetail(j.file ?? null);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId]);

  async function onUpload(file: File) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/files/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j.error || "No se pudo subir el archivo.");
      }
      setMsg("Archivo cargado y procesado correctamente.");
      await refresh();
      setSelectedId(j.fileId);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function reprocess(id: string) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch(`/api/files/${id}/reprocess`, { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Error al reprocesar.");
      setMsg("Reprocesado completado.");
      await refresh();
      await loadDetail(id);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este archivo y su conocimiento asociado?")) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch(`/api/files/${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Error al eliminar.");
      setMsg("Archivo eliminado.");
      setDetail(null);
      setSelectedId(null);
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function reindexAll() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await refresh();
      const ready = files;
      for (const f of ready) {
        await reprocess(f.id);
      }
      setMsg("Reindexación completada.");
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={variant === "dashboard" ? "card p-6" : "card p-5"}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Cargar documentos
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Arrastra y suelta o elige un archivo. Formatos: PDF, TXT, DOCX,
              CSV, XLSX, PNG, JPG.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <UploadBox disabled={busy} onUpload={onUpload} variant={variant} />
        </div>

        {msg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {msg}
          </div>
        )}
        {err && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {err}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-semibold text-slate-900">
            Documentos ({files.length})
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>
              Actualizar
            </Button>
            <Button type="button" variant="outline" disabled={busy || files.length === 0} onClick={() => void reindexAll()}>
              Reindexar todo
            </Button>
          </div>
        </div>

        <div className="mt-3 overflow-auto border border-slate-200 rounded-lg bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left font-medium px-4 py-3">Documento</th>
                <th className="text-left font-medium px-4 py-3">Tipo</th>
                <th className="text-left font-medium px-4 py-3">Tamaño</th>
                <th className="text-left font-medium px-4 py-3">Estado</th>
                <th className="text-left font-medium px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={5}>
                    Aún no hay archivos. Sube un PDF/Excel/CSV/Word/TXT para
                    comenzar.
                  </td>
                </tr>
              ) : (
                files.map((f) => (
                  <tr
                    key={f.id}
                    className={
                      "border-t border-slate-200 hover:bg-slate-50 " +
                      (selectedId === f.id ? "bg-slate-50" : "")
                    }
                  >
                    <td className="px-4 py-3">
                      <button
                        className="text-left font-medium text-slate-900 hover:underline decoration-slate-300"
                        onClick={() => setSelectedId(f.id)}
                      >
                        {f.original_name}
                      </button>
                      {f.status === "error" && (
                        <div className="text-xs text-rose-700 mt-1">
                          {f.error_message || "Error al procesar."}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {f.ext.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatBytes(f.size_bytes)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={f.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => reprocess(f.id)}
                        >
                          Reindexar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => remove(f.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={variant === "dashboard" ? "card p-6 space-y-3" : "card p-5 space-y-3"}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Vista previa</h2>
          {selectedRow && (
            <div className="text-xs text-slate-500">
              Fuente: <b>{selectedRow.original_name}</b>
            </div>
          )}
        </div>
        {!detail ? (
          <div className="text-sm text-slate-600">
            Selecciona un archivo para ver la vista previa.
          </div>
        ) : detail.status === "error" ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Error: {detail.error_message || "No se pudo procesar el archivo."}
          </div>
        ) : detail.status !== "ready" ? (
          <div className="text-sm text-slate-600">
            Procesando… (esto puede tardar unos segundos)
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800 rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-[360px] overflow-auto">
            {detail.preview_text || "Sin vista previa."}
          </pre>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: FileRow["status"] }) {
  const map: Record<FileRow["status"], { label: string; cls: string }> = {
    uploaded: { label: "Cargado", cls: "bg-slate-100 text-slate-700" },
    processing: { label: "Procesando", cls: "bg-amber-100 text-amber-800" },
    ready: { label: "Listo", cls: "bg-emerald-100 text-emerald-800" },
    error: { label: "Error", cls: "bg-rose-100 text-rose-800" }
  };
  const v = map[status];
  return (
    <span className={"inline-flex rounded-full px-2 py-1 text-xs font-medium " + v.cls}>
      {v.label}
    </span>
  );
}

function UploadBox({
  disabled,
  onUpload,
  variant
}: {
  disabled: boolean;
  onUpload: (file: File) => void | Promise<void>;
  variant: "default" | "dashboard";
}) {
  const [drag, setDrag] = useState(false);

  return (
    <div
      className={
        (variant === "dashboard"
          ? "rounded-2xl border-2 border-dashed p-10 transition text-center "
          : "rounded-xl border-2 border-dashed p-4 transition ") +
        (drag
          ? "border-primary-400 bg-primary-50"
          : "border-slate-200 bg-white")
      }
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(false);
        if (disabled) return;
        const f = e.dataTransfer.files?.[0];
        if (f) void onUpload(f);
      }}
    >
      <div className={variant === "dashboard" ? "space-y-4" : "flex items-center justify-between gap-4 flex-wrap"}>
        {variant === "dashboard" ? (
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
              <UploadIcon />
            </div>
            <div className="text-sm font-medium text-slate-900">
              Arrastra y suelta archivos aquí
            </div>
            <div className="text-xs text-slate-500">
              o haz clic para buscar en tu computadora
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                PDF
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                TXT
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                DOCX
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                CSV
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                XLSX
              </span>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm font-medium">Subir archivo</div>
            <div className="text-xs text-slate-500">
              Formatos: PDF, CSV, XLSX, DOCX, TXT.
            </div>
          </div>
        )}

        <label className={variant === "dashboard" ? "inline-flex justify-center" : "inline-flex items-center gap-2"}>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.csv,.xlsx,.xls,.txt,.docx,.png,.jpg,.jpeg"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
              e.currentTarget.value = "";
            }}
          />
          <span className={"btn-primary " + (disabled ? "opacity-60" : "")}>
            Seleccionar archivo
          </span>
        </label>
      </div>
    </div>
  );
}

function formatBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function UploadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 3v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 7l4-4 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 14v4a3 3 0 003 3h10a3 3 0 003-3v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

