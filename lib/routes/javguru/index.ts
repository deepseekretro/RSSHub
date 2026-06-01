import * as cheerio from 'cheerio';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: ['/', '/category/:category', '/tag/:tag', '/actress/:actress'],
    categories: ['anime'],
    example: '/javguru',
    parameters: {
        category: 'Category slug, e.g. `jav`, `english-subbed`, `decensored`',
        tag: 'Tag slug, e.g. `solowork`',
        actress: 'Actress slug, e.g. `tsukino-runa`',
    },
    name: 'Latest',
    maintainers: [],
    handler,
};

const BASE = 'https://jav.guru';

function buildUrl(ctx): string {
    const category = ctx.req.param('category');
    const tag = ctx.req.param('tag');
    const actress = ctx.req.param('actress');
    if (category) return `${BASE}/category/${category}/`;
    if (tag) return `${BASE}/tag/${tag}/`;
    if (actress) return `${BASE}/actress/${actress}/`;
    return `${BASE}/`;
}

async function handler(ctx) {
    const url = buildUrl(ctx);
    const response = await ofetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const $ = cheerio.load(response);

    const pageTitle = $('h1.page-title').text().trim() || 'JAV Guru';

    const list = $('div.grid1')
        .toArray()
        .map((el) => {
            const $el = $(el);
            const $a = $el.find('h2 a').first();
            return {
                title: $a.attr('title') || $a.text().trim(),
                link: $a.attr('href'),
            };
        })
        .filter((item) => item.link);

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const html = await ofetch(item.link, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                });
                const $p = cheerio.load(html);

                const cover = $p('div.large-screenimg img').attr('src');
                const pubDateStr =
                    $p('span.thedate').text().match(/Posted:\s*(.+)/)?.[1]?.trim() ||
                    $p('meta[property="article:published_time"]').attr('content');
                const info = $p('div.infometa div.infoleft ul').html() || '';
                const actress = $p('div.infometa li')
                    .filter((_, el) => $p(el).find('strong').text().includes('Actress'))
                    .find('a')
                    .map((_, el) => $p(el).text())
                    .toArray()
                    .join(', ');

                const description = cover
                    ? `<img src="${cover}" /><br/>${info}`
                    : info;

                return {
                    title: item.title,
                    link: item.link,
                    description,
                    author: actress,
                    pubDate: pubDateStr ? parseDate(pubDateStr) : undefined,
                };
            })
        )
    );

    return {
        title: `JAV Guru - ${pageTitle}`,
        link: url,
        item: items,
    };
}
