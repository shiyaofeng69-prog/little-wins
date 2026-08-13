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

打开 `http://localhost:5173`。默认自托管模式会自动创建本地用户。

## Docker

```bash
cp .env.docker .env
# 修改 SECRET_KEY 和 JWT_SECRET
docker compose up -d --build
```

默认访问地址为 `http://localhost:5173`。为了兼容已有安装，数据卷与
SQLite 文件仍使用早期名称；不要在升级时删除 `nightlio_data` 卷。

完整说明见 [docs/DOCKER.md](./docs/DOCKER.md)。
