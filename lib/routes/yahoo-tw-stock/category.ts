import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

const CATEGORIES: Record<string, { title: string; proxyId: string }> = {
    'news': { title: '財經新聞', proxyId: 'main-2-Title-Proxy' },
    'tw-market': { title: '台股盤勢', proxyId: 'main-0-Title-Proxy' },
    'etf': { title: 'ETF', proxyId: 'main-0-Title-Proxy' },
    'us-market-news': { title: '美股', proxyId: 'main-0-Title-Proxy' },
    'cnhk-market': { title: '陸港股', proxyId: 'main-0-Title-Proxy' },
    'gold': { title: '黃金', proxyId: 'main-0-Title-Proxy' },
};

export const route: Route = {
    path: '/category/:category',
    categories: ['finance'],
    example: '/yahoo-tw-stock/category/tw-market',
    parameters: {
        category: `Category slug. One of: ${Object.keys(CATEGORIES).join(', ')}`,
    },
    name: '分類新聞',
    maintainers: [],
    handler,
    radar: Object.keys(CATEGORIES).map((cat) => ({
        source: [`tw.stock.yahoo.com/${cat}`],
        target: `/category/${cat}`,
    })),
};

async function handler(ctx) {
    const category = ctx.req.param('category');
    const meta = CATEGORIES[category];
    if (!meta) {
        throw new Error(`Unknown category: ${category}. Valid options: ${Object.keys(CATEGORIES).join(', ')}`);
    }

    const url = `https://tw.stock.yahoo.com/${category}${category === 'news' ? '/' : ''}`;
    const html = await ofetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(html);

    const links: string[] = [];
    $(`#${meta.proxyId}`).parent().find('a[href*="/news/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('.html') && !href.includes('bcmt') && !links.includes(href)) {
            links.push(href);
        }
    });

    const items = await Promise.all(
        links.map((link) =>
            cache.tryGet(link, async () => {
                const articleHtml = await ofetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const $a = load(articleHtml);
                const section = $a('section.module-article-body');
                section.find('script, style, iframe, .ad, [class*="ad-"], .comments-wrapper, [class*="bg-toast-background"]').remove();
                return {
                    title: $a('h1').first().text().trim() || $a('title').text().trim(),
                    link,
                    description: section.html() || '',
                    pubDate: $a('time[datetime]').first().attr('datetime')
                        ? parseDate($a('time[datetime]').first().attr('datetime')!)
                        : undefined,
                    author: $a('[class*="author"]').first().text().trim() || undefined,
                };
            })
        )
    );

    return {
        title: `Yahoo股市 - ${meta.title}`,
        link: url,
        item: items,
    };
}
