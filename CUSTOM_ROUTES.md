# Custom Routes

本文档记录在此 fork 中新增的自定义路由。

---

## JAV Guru (`/javguru`)

**站点：** https://jav.guru/

| 路径 | 说明 | 示例 |
|------|------|------|
| `/javguru` | 首页最新 | `/javguru` |
| `/javguru/category/:category` | 分类 | `/javguru/category/english-subbed` |
| `/javguru/tag/:tag` | 标签 | `/javguru/tag/solowork` |
| `/javguru/actress/:actress` | 女优 | `/javguru/actress/tsukino-runa` |

**常用分类：** `jav` · `english-subbed` · `decensored`

每条 item 包含封面图、番号、发行日期、制作商、标签、女优信息。

---

## 鉅亨網 (`/cnyes`)

**站点：** https://news.cnyes.com/

| 路径 | 说明 | 示例 |
|------|------|------|
| `/cnyes/news/:category?` | 新闻分类（默认 `headline`） | `/cnyes/news/headline` |

**支持分类：**

| slug | 名称 |
|------|------|
| `headline` | 頭條新聞 |
| `headline_ai` | AI頭條 |
| `headline_all` | 所有頭條 |
| `news24h` | 24小時新聞 |
| `newsMarco` | 總經新聞 |
| `hotai` | 熱門AI |
| `stock_report` | 法人報告 |
| `topTopics` | 熱門話題 |

内容直接来自官方 API，包含完整正文、封面图、发布时间、作者、关键词标签。

---

## 搜狐号修复 (`/sohu/mp/:xpt`)

**变更：** `legacyIdHandler` fallback 时 title 改用作者名称而非数字 ID。

- 修复前：`搜狐号 - 119097`
- 修复后：`搜狐号 - 果壳网的个人主页`
