FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Las variables NEXT_PUBLIC_* se incrustan al compilar. Para cambiar el
# nombre de la marca en el bundle del cliente, pase --build-arg al construir.
ARG NEXT_PUBLIC_APP_NAME="Grupo Banzai Veracruz"
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
RUN mkdir -p public
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Runtime folders (mounted as volumes in compose)
RUN mkdir -p /app/uploads /app/parsed /app/db

EXPOSE 3000
CMD ["npm", "run", "start"]

