import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

const BASE = 'https://www.ctee.com.tw';

// section/subcat examples:
//   stock/twmarket  stock/futures  stock/warrant  stock/star  stock/insights
//   livenews/policy  livenews/stock  livenews/finance  livenews/industry
//   livenews/house  livenews/world  livenews/china  livenews/tech  livenews/life
export const route: Route = {
    path: '/:section/:subcat',
    categories: ['finance'],
    example: '/ctee/stock/twmarket',
    parameters: {
        section: '頻道，例如 `stock`、`livenews`',
        subcat: '子分類，例如 `twmarket`（上市櫃）、`futures`（期貨）、`warrant`（權證）、`policy`（要聞）、`industry`（產業）、`finance`（金融）、`world`（國際）',
    },
    name: '新聞列表',
    maintainers: [],
    handler,
    radar: [
        {
            source: ['www.ctee.com.tw/:section/:subcat'],
            target: '/:section/:subcat',
        },
    ],
};

async function handler(ctx) {
    const { section, subcat } = ctx.req.param();
    const listUrl = `${BASE}/${section}/${subcat}`;

    const listHtml = await ofetch(listUrl);
    const $ = load(listHtml);

    const articles: { link: string; title: string; pubDate?: string }[] = [];
    $('.newslist__card').each((_, el) => {
        const a = $(el).find('.news-title a');
        const href = a.attr('href');
        const title = a.text().trim();
        // /livenews/* has separate date+time; /stock/* has single time element
        const date = $(el).find('time.news-date').text().trim();
        const time = $(el).find('time.news-time').text().trim();
        const pubDate = date ? `${date} ${time}`.trim() : time || undefined;
        if (href && title) {
            articles.push({ link: `${BASE}${href}`, title, pubDate });
        }
    });

    const items = await Promise.all(
        articles.map(({ link, title, pubDate }) =>
            cache.tryGet(link, async () => {
                const html = await ofetch(link);
                const $a = load(html);
                const body = $a('.content__body');
                body.find('script, style, .article-function, .idle__content, [class*=ad]').remove();
                const timeText = $a('time').first().text().trim() || pubDate;
                const author = $a('.news-credit').text().trim() || undefined;
                const category = $a('.article-tag a, .news-category a')
                    .map((_, el) => $a(el).text().trim())
                    .get()
                    .filter((v, i, a) => a.indexOf(v) === i);
                return {
                    title,
                    link,
                    description: body.html() || '',
                    pubDate: timeText ? parseDate(timeText) : undefined,
                    author,
                    category: category.length ? category : undefined,
                };
            })
        )
    );

    const pageTitle = $('h1, .page-title, title').first().text().trim().split(' - ')[0] || subcat;

    return {
        title: `工商時報 - ${pageTitle}`,
        link: listUrl,
        item: items,
    };
}
