# Guía de Despliegue (VPS / Subdominio) — MVP

## Requisitos

- Un VPS con Docker instalado
- Un dominio (por ejemplo: `tudominio.com`)
- Un subdominio apuntando al VPS (por ejemplo: `bot.tudominio.com`)
- (Recomendado) Un reverse proxy como Nginx o Traefik para SSL y subdominios

## Opción A: Docker Compose (recomendado para MVP)

1) Copiar el proyecto al VPS

2) Crear archivo `.env`

Basado en `.env.example`:

- `ADMIN_EMAIL` y `ADMIN_PASSWORD`
- Opcional: `OPENAI_API_KEY` o `GEMINI_API_KEY`

3) Levantar el servicio

```bash
docker compose up --build -d
```

La app quedará escuchando en el puerto **3000**.

## Opción B: Construir imagen y correr contenedor

```bash
docker build -t spanish-chatbot-mvp .
docker run -d --name chatbot \
  -p 3000:3000 \
  -e ADMIN_EMAIL=admin@demo.com \
  -e ADMIN_PASSWORD=admin1234 \
  -e OPENAI_API_KEY= \
  -e GEMINI_API_KEY= \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/parsed:/app/parsed \
  -v $(pwd)/db:/app/db \
  spanish-chatbot-mvp
```

## Subdominio + reverse proxy (idea general)

### Nginx (ejemplo conceptual)

- Configurar Nginx para apuntar `bot.tudominio.com` → `http://127.0.0.1:3000`
- Activar SSL con Let’s Encrypt (Certbot) o usar un proxy como Traefik

## Múltiples chatbots en diferentes subdominios (futuro-ready)

Puedes ejecutar **varios contenedores**, cada uno con:

- su propio puerto (ej: 3001, 3002…)
- su propio volumen de `db/`, `uploads/` y `parsed/`
- su propio subdominio en el reverse proxy

Ejemplo:

- `autos.tudominio.com` → contenedor A
- `ropa.tudominio.com` → contenedor B
- `inmuebles.tudominio.com` → contenedor C

Esto permite separar datos y casos de uso por negocio sin cambiar el MVP.

## Nota sobre WhatsApp Business (no incluido en MVP)

En una versión posterior se puede integrar WhatsApp Business (Cloud API) y enrutar mensajes al endpoint del chatbot, manteniendo el mismo motor de RAG/IA.

