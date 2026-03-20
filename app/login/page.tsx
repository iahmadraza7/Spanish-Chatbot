import Link from "next/link";

export default function LoginPage({
  searchParams
}: {
  searchParams?: { next?: string };
}) {
  const nextPath = searchParams?.next ?? "/admin";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
          <p className="text-sm text-slate-600">
            Accede al panel de administración para subir archivos y actualizar
            la base de conocimiento.
          </p>
        </div>

        <form className="space-y-4" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={nextPath} />

          <div className="space-y-1">
            <label className="text-sm font-medium">Correo</label>
            <input
              className="input"
              name="email"
              type="email"
              placeholder="admin@demo.com"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Contraseña</label>
            <input
              className="input"
              name="password"
              type="password"
              placeholder="admin1234"
              required
            />
          </div>

          <button className="btn-primary w-full" type="submit">
            Entrar
          </button>
        </form>

        <div className="text-xs text-slate-500 space-y-2">
          <p>
            Demo rápida: usa <b>admin@demo.com</b> / <b>admin1234</b> (o define
            variables <code>ADMIN_EMAIL</code> y <code>ADMIN_PASSWORD</code>).
          </p>
          <p>
            <Link className="underline" href="/chat">
              Ir al chatbot sin iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

