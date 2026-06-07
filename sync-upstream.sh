#!/bin/bash
set -e

# 从 upstream 拉取最新代码（不自动合并）
git fetch upstream

# 将本地提交 rebase 到 upstream/master 之上
git rebase upstream/master

# 强制推送到自己的 fork（rebase 会重写历史，需要 force push）
git push origin master --force-with-lease
