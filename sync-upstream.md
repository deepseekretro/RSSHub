# sync-upstream.sh

同步上游 [DIYgod/RSSHub](https://github.com/DIYgod/RSSHub) 最新代码到本地及自己的 fork。

## 使用方式

```bash
./sync-upstream.sh
```

## 原理

1. `git fetch upstream` — 拉取上游最新代码
2. `git rebase upstream/master` — 将本地提交变基到上游之上，保持线性历史
3. `git push origin master --force-with-lease` — 推送到自己的 fork（rebase 后需要强制推送）

## 前提条件

已配置 upstream remote：

```bash
git remote add upstream https://github.com/DIYgod/RSSHub.git
```

## 注意

此脚本只同步到自己的 fork，不会向上游提交代码。如需贡献代码，请在 GitHub 上发起 Pull Request。
