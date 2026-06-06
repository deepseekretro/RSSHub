import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import iconv from 'iconv-lite';

const BASE = 'https://www.investor.com.tw';
const LIST_URL = `${BASE}/onlineNews/TodayNews.asp`;

// Sub-category IDs (3-digit anchor id on the list page):
// 新聞: 001國內財經 002國際財經 004傳產股 005高科技股 047大中華
// 焦點: 041期貨 048盤勢分析
// 投資: 012焦點股
// 產業: 014金融產業 015傳統產業 016科技要聞 017生技產業 051興櫃股票
// 股市: 020港股 021陸股 022亞股 023歐股 024美股
// 法人: 026外資動態 027法人報告 029市場動向
// 外匯: 030外匯新聞 031台幣走向 032央行動態
// 理財: 036基金 038債市 039房地產
// 原物料: 042油金 044金屬
export const route: Route = {
    path: '/news/:cat?',
    categories: ['finance'],
    example: '/investor-tw/news/005',
    parameters: {
        cat: '子分類 ID，例如 `005`（高科技股）、`002`（國際財經）、`024`（美股）、`026`（外資動態）、`029`（市場動向）。留空則取全部今日新聞。',
    },
    name: '今日新聞',
    maintainers: [],
    handler,
    radar: [
        {
            source: ['www.investor.com.tw/onlineNews/TodayNews.asp'],
            target: '/news',
        },
    ],
};

function parseArticles($: ReturnType<typeof load>, html: string, cat?: string) {
    const articles: { link: string; title: string; pubDate?: string; author?: string; catLabel?: string }[] = [];

    if (cat) {
        // Slice HTML from the cat anchor to the next anchor
        const start = html.indexOf(`name="#${cat}"`);
        if (start === -1) {
            return articles;
        }
        const nextAnchorIdx = html.indexOf('name="#0', start + 10);
        const chunk = nextAnchorIdx === -1 ? html.slice(start) : html.slice(start, nextAnchorIdx);

        // label is in the same <p> as the anchor, search backwards from anchor position
        const lineStart = html.lastIndexOf('<p', start);
        const labelMatch = html.slice(lineStart, start + 20).match(/【([^】]+)】/);
        const catLabel = labelMatch ? labelMatch[1] : cat;

        load(chunk)('ul.NEWS_TITLE').each((_, el) => {
            const $el = load(el);
            const a = $el('.TODAY_NEWS_TITLE a');
            const href = a.attr('href');
            const title = a.text().trim();
            const date = $el('.TODAY_NEWS_DATE').text().trim();
            const author = $el('.NEWS_AUTHOR').text().trim();
            if (href && title) {
                articles.push({
                    link: href.startsWith('http') ? href : `${BASE}/onlineNews/${href}`,
                    title, pubDate: date || undefined,
                    author: author || undefined,
                    catLabel,
                });
            }
        });
    } else {
        $('ul.NEWS_TITLE').each((_, el) => {
            const a = $(el).find('.TODAY_NEWS_TITLE a');
            const href = a.attr('href');
            const title = a.text().trim();
            const date = $(el).find('.TODAY_NEWS_DATE').text().trim();
            const author = $(el).find('.NEWS_AUTHOR').text().trim();
            if (href && title) {
                articles.push({
                    link: href.startsWith('http') ? href : `${BASE}/onlineNews/${href}`,
                    title, pubDate: date || undefined,
                    author: author || undefined,
                });
            }
        });
    }

    return articles;
}

async function handler(ctx) {
    const cat = ctx.req.param('cat');

    const buf = await ofetch(LIST_URL, { responseType: 'arrayBuffer' });
    const html = iconv.decode(Buffer.from(buf), 'big5');
    const $ = load(html);

    const articles = parseArticles($, html, cat);

    const items = await Promise.all(
        articles.map(({ link, title, pubDate, author, catLabel }) =>
            cache.tryGet(link, async () => {
                const articleNo = new URL(link).searchParams.get('articleNo');
                const mobileUrl = `${BASE}/MobileHttps/content.asp?articleNo=${articleNo}`;
                const articleHtml = await ofetch(mobileUrl, { responseType: 'text', headers: { 'User-Agent': 'curl/7.88' } });
                const $a = load(articleHtml);
                const fullTitle = $a('h2.page-name').first().text().trim() || title;
                const timeText = $a('div.time').first().text().trim();
                const body = $a('[data-desc="content"]');
                body.find('script, style, .ad, [id^="ad-"], [id^="div-gpt"], .B1').remove();
                const description = (body.html() || '').replaceAll(/<!--[\s\S]*?-->/g, '').trim();
                return {
                    title: fullTitle,
                    link,
                    description,
                    pubDate: timeText ? parseDate(timeText) : pubDate ? parseDate(pubDate) : undefined,
                    author,
                    category: catLabel ? [catLabel] : undefined,
                };
            })
        )
    );

    // Feed title
    let feedCat = '今日新聞';
    if (cat) {
        const anchorPos = html.indexOf(`name="#${cat}"`);
        const lineStart = html.lastIndexOf('<p', anchorPos);
        const labelMatch = html.slice(lineStart, anchorPos + 20).match(/【([^】]+)】/);
        feedCat = labelMatch ? labelMatch[1] : cat;
    }

    return {
        title: `財訊快報 - ${feedCat}`,
        link: LIST_URL,
        item: items,
    };
}
