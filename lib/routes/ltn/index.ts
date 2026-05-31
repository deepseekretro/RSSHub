import * as cheerio from 'cheerio';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/ec/:category?',
    categories: ['finance'],
    example: '/ltn/ec/securities',
    parameters: {
        category: '分類 slug（預設 `securities`）。可選：`securities` · `investment` · `international` · `estate` · `strategy` · `breakingnews`',
    },
    name: '財經新聞',
    maintainers: [],
    handler,
};

const CATEGORY_NAMES: Record<string, string> = {
    securities: '證券產業',
    investment: '基金理財',
    international: '國際財經',
    estate: '房市',
    strategy: '財經政策',
    breakingnews: '即時新聞',
    weeklybiz: '財經週報',
};

const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

async function handler(ctx) {
    const category = ctx.req.param('category') || 'securities';
    const url = `https://ec.ltn.com.tw/list/${category}`;

    const html = await ofetch(url, { headers: HEADERS });
    const $ = cheerio.load(html);

    const list = $('a.boxText[data-desc]')
        .toArray()
        .map((el) => {
            const $el = $(el);
            const title = $el.attr('title') || $el.attr('data-desc')?.split(':').slice(2).join(':').trim() || '';
            const link = $el.attr('href') || '';
            return { title, link };
        })
        .filter((item) => item.link.startsWith('https://ec.ltn.com.tw/article/'));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const articleHtml = await ofetch(item.link, { headers: HEADERS });
                const $a = cheerio.load(articleHtml);

                const ld = $a('script[type="application/ld+json"]')
                    .toArray()
                    .map((el) => {
                        try { return JSON.parse($a(el).html()); } catch { return null; }
                    })
                    .find((d) => d?.datePublished);

                // fix lazy images and extract div.text HTML
                $a('div[class="text"] img[data-src]').each((_, el) => {
                    const $img = $a(el);
                    $img.attr('src', $img.attr('data-src'));
                    $img.removeAttr('data-src');
                });
                // remove ads and hidden elements
                $a('div[class="text"] .before_ir, div[class="text"] [id^="ad-"], div[class="text"] script').remove();
                const bodyHtml = $a('div[class="text"]').html()?.trim() || '';

                return {
                    title: ld?.headline || item.title,
                    link: item.link,
                    description: bodyHtml,
                    pubDate: ld?.datePublished ? parseDate(ld.datePublished) : undefined,
                    author: ld?.author?.name || undefined,
                    category: ld?.articleSection ? [ld.articleSection] : undefined,
                };
            })
        )
    );

    return {
        title: `自由財經 - ${CATEGORY_NAMES[category] ?? category}`,
        link: url,
        item: items,
    };
}
