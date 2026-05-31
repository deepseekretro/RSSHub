# 本地开发说明

## 启动脚本

### 开发模式

```bash
bash start-dev.sh
```

- 使用 `tsx` 直接运行 TypeScript 源码
- 自动停止生产版（pm2 rsshub）并释放 1200 端口
- 环境：`NODE_ENV=dev`，Redis 缓存

### 生产模式

```bash
bash start-prod.sh
```

- 先执行 `pnpm run build` 编译
- 通过 pm2 后台运行，进程名 `rsshub`
- 常用命令：`pm2 logs rsshub` / `pm2 restart rsshub` / `pm2 stop rsshub`

## 环境依赖

- Node.js（通过 nvm 管理）
- pnpm
- Redis（`redis-server`，监听 `localhost:6379`）
- pm2（生产模式）

## 自定义路由

本地新增的路由说明见 [CUSTOM_ROUTES.md](./CUSTOM_ROUTES.md)。
