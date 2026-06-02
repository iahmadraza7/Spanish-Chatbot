import type { Metadata } from "next";
import "./globals.css";

const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME || "Grupo Banzai Veracruz";

export const metadata: Metadata = {
  title: `${APP_NAME} — Asistente`,
  description: `Asistente de ventas en español para ${APP_NAME}.`
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

