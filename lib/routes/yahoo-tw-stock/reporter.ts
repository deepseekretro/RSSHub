import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/reporter',
    categories: ['finance'],
    example: '/yahoo-tw-stock/reporter',
    name: '特派記者報導',
    maintainers: [],
    handler,
    radar: [
        {
            source: ['tw.stock.yahoo.com/reporter'],
        },
    ],
};

async function handler() {
    const html = await ofetch('https://tw.stock.yahoo.com/reporter', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(html);

    const links: string[] = [];
    $('li.js-stream-content a[href*="/news/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('bcmt') && !links.includes(href)) {
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
        title: 'Yahoo財經特派報導',
        link: 'https://tw.stock.yahoo.com/reporter',
        item: items,
    };
}
