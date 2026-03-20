import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panel de Chatbot AI - Demo",
  description:
    "MVP de panel de administración y chatbot en español para demostración al cliente."
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

