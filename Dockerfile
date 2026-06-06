# syntax=docker/dockerfile:1

# ---- deps: full install for building (incl. dev deps for `next build`) ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Puppeteer is only used by the local manual-builder script, never at runtime.
# Skip its Chromium download so the image builds reliably and stays small.
ENV PUPPETEER_SKIP_DOWNLOAD=1
RUN npm install --no-audit --no-fund

# ---- builder: compile the Next.js app ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* se incrustan al compilar. Cambia la marca con --build-arg.
ARG NEXT_PUBLIC_APP_NAME="Grupo Banzai Veracruz"
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
RUN mkdir -p public
RUN npm run build

# ---- prod-deps: production-only modules for a smaller runtime image ----
FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
ENV PUPPETEER_SKIP_DOWNLOAD=1
RUN npm install --omit=dev --no-audit --no-fund

# ---- runner: minimal production image ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Runtime folders (mounted as volumes in compose)
RUN mkdir -p /app/uploads /app/parsed /app/db

EXPOSE 3000
CMD ["npm", "run", "start"]
