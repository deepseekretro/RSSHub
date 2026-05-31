#!/bin/bash
source /root/.nvm/nvm.sh
cd /var/www/RSSHub
pnpm run build
pm2 delete rsshub 2>/dev/null
PORT=1200 NODE_ENV=production NODE_OPTIONS="--max-http-header-size=32768" \
  CACHE_TYPE=redis REDIS_URL=redis://localhost:6379 \
  pm2 start dist/index.mjs --name rsshub
