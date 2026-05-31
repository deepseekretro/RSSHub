# 自定义路由文档

本文件记录本地新增的自定义路由。

---

## 鉅亨網 (cnyes)

**Namespace:** `cnyes`  
**URL:** https://news.cnyes.com

### 新聞分類

| 路由 | 示例 |
|------|------|
| `/cnyes/news/:category?` | `/cnyes/news/headline` |

**category 可选值：**

| slug | 名称 |
|------|------|
| `headline`（默认）| 頭條新聞 |
| `headline_ai` | AI頭條 |
| `news24h` | 24小時新聞 |
| `newsMarco` | 總經新聞 |
| `hotai` | 熱門AI |
| `stock_report` | 法人報告 |
| `topTopics` | 熱門話題 |

---

## 自由財經 (ltn)

**Namespace:** `ltn`  
**URL:** https://ec.ltn.com.tw

### 財經新聞

| 路由 | 示例 |
|------|------|
| `/ltn/ec/:category?` | `/ltn/ec/securities` |

**category 可选值：**

| slug | 名称 |
|------|------|
| `securities`（默认）| 證券產業 |
| `breakingnews` | 即時新聞 |
| `strategy` | 財經政策 |
| `international` | 國際財經 |
| `estate` | 房產資訊 |
| `investment` | 投資理財 |
| `weeklybiz` | 財經週報 |

---

## StockFeel 股感 (stockfeel)

**Namespace:** `stockfeel`  
**URL:** https://www.stockfeel.com.tw

### 分類文章

| 路由 | 示例 |
|------|------|
| `/stockfeel/category/:slug?` | `/stockfeel/category/stocks-futures` |

**slug 可选值：**

| slug | 名称 |
|------|------|
| `stocks-futures`（默认）| 股票期貨 |
| `investment-strategy` | 投資策略 |
| `macro-economy` | 宏觀經濟 |
| `fund` | 基金實務 |
| `financial-planning` | 理財規劃 |
| `business-strategy-2` | 商業策略 |
| `alternative-investment` | 另類投資 |

内容通过 WordPress REST API 获取，包含头图和全文。
