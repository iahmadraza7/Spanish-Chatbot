# Spanish Chatbot MVP (Next.js)

This repository is a **demo/MVP** for a Spanish-language chatbot with an admin panel that can **upload business files** (PDF/Excel/CSV/Word/TXT) and answer questions based on them.

## Features (MVP)

- Spanish UI: `/login`, `/admin`, `/chat`
- Admin login (simple cookie session)
- Upload + parse files (PDF/CSV/XLSX/TXT/DOCX)
- SQLite storage (`db/app.db`)
- Lightweight RAG: chunking + keyword retrieval
- AI provider layer (OpenAI). If no key is set, uses fallback mode.

## Requirements

- Node.js 20+
- npm

## Setup (local)

```bash
npm install
copy .env.example .env
npm run dev
```

Open:
- Home: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Admin: `http://localhost:3000/admin`
- Chat: `http://localhost:3000/chat`

## Admin login

Admin credentials are **required** via env vars (no defaults in production):
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Set them in `.env` before starting the app.

## How to upload files

1. Go to `/admin`
2. Drag & drop or click **Elegir archivo**
3. Wait until status shows **Listo**
4. Open `/chat` and ask questions in Spanish

## How to test chatbot

Try:
- `¿Qué autos están disponibles?`
- `¿Cuál es el precio del [modelo]?`
- `¿Qué unidades hay por menos de 20000?`
- `¿Hay opciones en color blanco?`

## Running with Docker

Build and run:

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

## Health check

`GET /api/health` returns counts of files/chunks and a timestamp.

