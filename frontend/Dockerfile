# Frontend production image — multi-stage:
#   node build stage runs tsc + vite build (same script as local `npm run build`)
#   nginx stage serves the static bundle and reverse-proxies /api/v1 to the backend.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Same-origin API by default (VITE_API_BASE_URL/ ... `/api/v1`), unless overridden.
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:80/api/v1/health || exit 1