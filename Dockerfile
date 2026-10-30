# Cloud Run 部署用（從 GitHub 持續部署時，建置類型選「Dockerfile」）
# 執行時需設定環境變數 GEMINI_API_KEY（建議用 Secret Manager）；Cloud Run 會自動提供 PORT。

FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# server.ts 以 tsx 執行，因此保留完整 node_modules
COPY --from=build /app /app
EXPOSE 8080
CMD ["npx", "tsx", "server.ts"]
