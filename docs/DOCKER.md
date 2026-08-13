# Little Wins Docker 部署

## 启动

```bash
cp .env.docker .env
openssl rand -hex 32
# 将生成值分别写入 SECRET_KEY 与 JWT_SECRET
docker compose up -d --build
```

服务：

- Web：`http://localhost:5173`
- API：`http://localhost:5000`

## 数据兼容

项目仍将 SQLite 数据保存在 `/app/data/nightlio.db`，并继续使用
`nightlio_data` Docker 卷。这是有意保留的兼容层，确保从早期 Nightlio
工程基础升级时不丢失记录。产品身份已经迁移，但数据路径不会在没有正式
迁移脚本的情况下擅自更名。

备份：

```bash
docker run --rm \
  -v nightlio_data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/little-wins-backup.tar.gz -C /data .
```

恢复前请先停止服务，并自行确认备份文件。

## 生产环境

设置域名、TLS 文件和安全密钥后：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

公开部署修改版本时，应按照 AGPL-3.0 向网络用户提供对应源码入口。应用
设置页已经包含源码链接。
