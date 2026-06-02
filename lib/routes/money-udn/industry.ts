import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/industry',
    categories: ['finance'],
    example: '/money-udn/industry',
    name: '產業熱點',
    maintainers: [],
    handler,
    radar: [
        {
            source: ['money.udn.com/money/cate/5591'],
            target: '/industry',
        },
    ],
};

async function handler() {
    const listHtml = await ofetch('https://money.udn.com/money/cate/5591', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const $ = load(listHtml);

    const links: string[] = [];
    $('span').each((_, el) => {
        if ($(el).text().trim() === '產業熱點') {
            const href = $(el).next('a').attr('href') || $(el).siblings('a').first().attr('href');
            if (href) {
                const url = 'https://money.udn.com' + href.split('?')[0];
                if (!links.includes(url)) {
                    links.push(url);
                }
            }
        }
    });

    const items = await Promise.all(
        links.map((link) =>
            cache.tryGet(link, async () => {
                const html = await ofetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const $a = load(html);
                const body = $a('.article-body');
                body.find('script, style, .ad, [class*="ad-"]').remove();
                const timeText = $a('[class*="time"]').filter((_, el) => /\d{4}\/\d{2}\/\d{2}/.test($a(el).text())).first().text().trim();
                return {
                    title: $a('h1').first().text().trim(),
                    link,
                    description: body.html() || '',
                    pubDate: timeText ? parseDate(timeText) : undefined,
                };
            })
        )
    );

    return {
        title: '經濟日報 - 產業熱點',
        link: 'https://money.udn.com/money/cate/5591',
        item: items,
    };
}
