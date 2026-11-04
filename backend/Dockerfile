FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
LABEL org.opencontainers.image.source="https://github.com/helmipradita/ttlock-dashboard"
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
ENV PORT=80
EXPOSE 80
CMD ["node", "dist/main.js"]
