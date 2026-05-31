#!/bin/bash
source /root/.nvm/nvm.sh
pm2 delete rsshub 2>/dev/null
fuser -k 1200/tcp 2>/dev/null
sleep 1
cd /var/www/RSSHub
exec env PORT=1200 NODE_ENV=dev NODE_OPTIONS="--max-http-header-size=32768" \
  CACHE_TYPE=redis REDIS_URL=redis://localhost:6379 \
  node_modules/.bin/tsx lib/index.ts
