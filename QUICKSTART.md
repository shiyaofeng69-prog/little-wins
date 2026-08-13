# 小小做到 · 快速启动

## 本地开发

```bash
npm install
npm run dev
```

另开一个终端启动 API：

```bash
npm run api
```

打开 `http://localhost:5173`。开发模式会自动创建仅供本机使用的本地用户。

## Docker

```bash
cp .env.docker .env
# 本地 compose 只绑定 127.0.0.1；公开部署请另外填写强密钥、CORS 和登录方式
docker compose up -d --build
```

默认访问地址为 `http://localhost:5173`。为了兼容已有安装，数据卷与
SQLite 文件仍使用早期名称；不要在升级时删除 `nightlio_data` 卷。

完整说明见 [docs/DOCKER.md](./docs/DOCKER.md)。

公开部署使用 `docker-compose.prod.yml`，并至少配置：

- 独立随机的 `SECRET_KEY` 与 `JWT_SECRET`；
- 实际 HTTPS 域名对应的 `CORS_ORIGINS`；
- `LOCAL_ACCESS_PASSWORD`（至少 12 位）或 Google OAuth。
