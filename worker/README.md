# Gerden Blog Worker

Hono + Drizzle ORM + Cloudflare Workers + D1 后端。

## 本地开发

```txt
npm ci
npm run db:migrate:local
npm run dev
```

## 部署

```txt
npm run deploy
```

首次部署不能只执行这一条命令。D1、Queue、`JWT_SECRET`、生产域名和远程迁移的完整流程见 [后端部署手册](../docs/backend-deployment.md)。

## 类型生成

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
