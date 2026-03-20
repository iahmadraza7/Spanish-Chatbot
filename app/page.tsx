import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900 text-center">
          Demo de Chatbot para Negocios
        </h1>
        <p className="text-sm text-slate-600 text-center">
          Este es un MVP de un sistema de chatbot en español con panel de
          administración para cargar archivos de negocio.
        </p>
        <div className="space-y-3">
          <Link href="/login" className="btn-primary w-full text-center">
            Iniciar sesión como administrador
          </Link>
          <Link
            href="/chat"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ir al chatbot de demostración
          </Link>
        </div>
      </div>
    </main>
  );
}

