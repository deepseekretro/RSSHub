import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

const BASE = 'https://money.udn.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// cid 0 = 總覽, 5591 = 產業, 5590 = 證券, 5588 = 國際, 5589 = 兩岸,
// 12017 = 金融, 11111 = 期貨, 5592 = 理財, 5593 = 房市, 10846 = 要聞,
// 5595 = 專欄, 123428 = 專題, 5596 = 品味, 122327 = OFF學
export const route: Route = {
    path: '/category/:cid',
    categories: ['finance'],
    example: '/money-udn/category/5591',
    parameters: {
        cid: '分類 ID，例如 `0`（總覽）、`5591`（產業）、`5590`（證券）、`5588`（國際）、`5589`（兩岸）、`12017`（金融）、`11111`（期貨）、`5592`（理財）、`5593`（房市）',
    },
    name: '即時新聞',
    maintainers: [],
    handler,
    radar: [
        {
            source: ['money.udn.com/rank/newest/1001/:cid/*'],
            target: '/category/:cid',
        },
    ],
};

async function handler(ctx) {
    const cid = ctx.req.param('cid');
    const listUrl = `${BASE}/rank/newest/1001/${cid}/1`;

    const listHtml = await ofetch(listUrl, { headers: { 'User-Agent': UA } });
    const $ = load(listHtml);

    // Get category name from active tab
    const categoryName = $('.story-theme-link__item a').filter((_, el) => {
        const href = $(el).attr('href') || '';
        return href.includes(`/${cid}/`);
    }).first().text().trim() || cid;

    const articles: { link: string; title: string; pubDate?: string }[] = [];
    $('.story-list-holder .story-headline-wrapper').each((_, el) => {
        const a = $(el).find('.story__content a').first();
        const href = a.attr('href');
        const title = a.find('.story__headline').text().trim();
        const time = $(el).find('time').text().trim();
        if (href && title) {
            const path = new URL(href, BASE).pathname;
            articles.push({ link: `${BASE}${path}`, title, pubDate: time || undefined });
        }
    });

    const items = await Promise.all(
        articles.map(({ link, title, pubDate }) =>
            cache.tryGet(link, async () => {
                const html = await ofetch(link, { headers: { 'User-Agent': UA } });
                const $a = load(html);
                const editor = $a('.article-body__editor');
                editor.find('script, style, .edn-ads--inlineAds, .coverstoryad').remove();
                const keywords = $a('.article-keyword__item a')
                    .map((_, el) => $a(el).text().trim())
                    .get()
                    .filter((v, i, a) => a.indexOf(v) === i);
                const timeText = $a('time.article-body__time').text().trim() || pubDate;
                return {
                    title,
                    link,
                    description: editor.html() || '',
                    pubDate: timeText ? parseDate(timeText) : undefined,
                    author: $a('.article-body__info').text().trim() || undefined,
                    category: keywords.length ? keywords : undefined,
                };
            })
        )
    );

    return {
        title: `經濟日報 - ${categoryName}`,
        link: listUrl,
        item: items,
    };
}
