import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import parser from '@/utils/rss-parser';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/news',
    categories: ['finance'],
    example: '/yahoo-tw-stock/news',
    name: '最新新聞',
    maintainers: [],
    handler,
    radar: [
        {
            source: ['tw.stock.yahoo.com/'],
        },
    ],
};

async function handler() {
    const feed = await parser.parseURL('https://tw.stock.yahoo.com/rss');

    const items = await Promise.all(
        feed.items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const html = await ofetch(item.link!, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const $ = load(html);
                const section = $('section.module-article-body');
                section.find('script, style, iframe, .ad, [class*="ad-"], .comments-wrapper, [class*="bg-toast-background"]').remove();
                const description = section.html() || item.content || item.contentSnippet || '';
                return {
                    title: item.title,
                    link: item.link,
                    description,
                    pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
                };
            })
        )
    );

    return {
        title: feed.title,
        link: 'https://tw.stock.yahoo.com/',
        item: items,
    };
}
