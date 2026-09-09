# Imagen construida desde la raíz del frontend (etribunal-ui):
#   docker build -f Dockerfile -t etribunal/ui .
FROM node:22-alpine

WORKDIR /app

# pnpm global (versión fijada en package.json: pnpm@11.5.0)
RUN npm install -g pnpm@11.5.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

# Dev server de Vite (host 0.0.0.0 para acceso desde el host)
ENV DISABLE_HMR=true
CMD ["pnpm", "dev"]