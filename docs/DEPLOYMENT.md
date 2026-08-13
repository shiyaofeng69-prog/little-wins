# Little Wins 生产部署说明

## 最低要求

- Docker Engine 24+
- Docker Compose v2
- 可写的数据卷
- 生产域名与 TLS 证书
- 独立、随机生成的 `SECRET_KEY` 和 `JWT_SECRET`

## 部署

```bash
cp .env.docker .env
# 配置密钥、CORS_ORIGINS 及可选 Google OAuth
docker compose -f docker-compose.prod.yml up -d --build
```

生产编排由 Nginx 对外提供 Web 与 `/api` 代理。API 和 SQLite 不应直接暴露
到公网。

## 升级与备份

升级前必须备份 `nightlio_data` 卷。该名称是为兼容早期数据而保留的，
不代表当前产品品牌。

```bash
docker compose -f docker-compose.prod.yml down
docker run --rm -v nightlio_data:/data -v "$PWD":/backup \
  alpine tar czf /backup/little-wins-$(date +%F).tar.gz -C /data .
docker compose -f docker-compose.prod.yml up -d --build
```

## 开源义务

Little Wins 采用 GNU AGPL-3.0。若你向网络用户提供修改后的版本，应提供
该运行版本的对应源码。不要移除设置页中的源码入口，除非你用同等清晰的
方式替代它。来源与修改说明见根目录 `NOTICE.md`。
