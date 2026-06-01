import * as cheerio from 'cheerio';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/news/:category?',
    categories: ['finance'],
    example: '/moneydj/news/X0300000',
    parameters: {
        category: '分類代碼（預設 `X0300000` 產業分析）。如 `X0100000` 市場動態、`X0200000` 個股情報、`X2000000` 總體經濟等',
    },
    name: '財經新聞',
    maintainers: [],
    handler,
};

const BASE = 'https://www.moneydj.com';
const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

async function handler(ctx) {
    const category = ctx.req.param('category') || 'X0300000';
    const listUrl = `${BASE}/kmdj/common/listnewarticles.aspx?svc=NW&a=${category}`;

    const html = await ofetch(listUrl, { headers: HEADERS });
    const $ = cheerio.load(html);

    const pageTitle = $('h1, h2, h3').first().text().trim();

    const list = $('td.ArticleTitle a')
        .toArray()
        .map((el) => {
            const $el = $(el);
            return {
                title: $el.attr('title') || $el.text().trim(),
                link: BASE + $el.attr('href'),
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const articleHtml = await ofetch(item.link, { headers: HEADERS });
                const $a = cheerio.load(articleHtml);

                const contentTd = $a('td#Contents');
                // remove scripts and nav elements
                contentTd.find('script, .CBItem, style').remove();
                const description = contentTd.html()?.trim() || '';

                const dateText = contentTd.text().match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/)?.[1];

                return {
                    title: item.title,
                    link: item.link,
                    description,
                    pubDate: dateText ? parseDate(dateText) : undefined,
                };
            })
        )
    );

    return {
        title: `MoneyDJ - ${pageTitle.split('-').pop()?.trim() ?? pageTitle}`,
        link: listUrl,
        item: items,
    };
}
