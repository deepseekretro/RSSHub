import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

const BASE = 'https://www.businessweekly.com.tw';

export const route: Route = {
    path: '/channel/:channelType/:channelId',
    categories: ['finance'],
    example: '/businessweekly/channel/business/0000000319',
    parameters: {
        channelType: '頻道類型，例如 `business`（財經）',
        channelId: '頻道 ID，例如 `0000000319`（財經頻道）',
    },
    name: '頻道最新文章',
    maintainers: ['deepseekretro'],
    radar: [
        {
            source: ['www.businessweekly.com.tw/channel/:channelType/:channelId'],
            target: '/channel/:channelType/:channelId',
        },
    ],
    handler,
};

async function handler(ctx) {
    const { channelType, channelId } = ctx.req.param();
    const channelUrl = `${BASE}/channel/${channelType}/${channelId}`;

    const html = await ofetch(channelUrl, { responseType: 'text' });
    const $ = load(html);

    const channelTitle = $('title').text().split('|')[0].trim() || '商業周刊';

    const items = await Promise.all(
        $('#Newest .Article-figure')
            .toArray()
            .map((el) => {
                const $el = $(el);
                const href = $el.find('.Article-img a').attr('href') || $el.find('.Article-content a').attr('href');
                const title = $el.find('.Article-content a').text().trim();
                const dateText = $el.find('.Article-date').text().trim();
                const img = $el.find('img').attr('src');
                if (!href || !title) {
                    return null;
                }
                const link = href.startsWith('http') ? href : `${BASE}${href}`;
                return cache.tryGet(link, async () => {
                    const articleHtml = await ofetch(link, { responseType: 'text' });
                    const $a = load(articleHtml);

                    const pubDate = $a('time').attr('datetime') || dateText;
                    const category = ($a('#gtm_group_list').attr('value') || '').split(',').filter(Boolean);
                    const author = $a('.Single-author-row-name').first().text().replace(/^撰文者：/, '').trim() || undefined;
                    const image = $a('meta[property="og:image"]').attr('content') || img;

                    // Remove ads from content
                    const $content = $a('.Single-article.WebContent');
                    $content.find('ins, .Google-special, script, style').remove();
                    const description = $content.html()?.trim() || '';

                    return {
                        title,
                        link,
                        description,
                        pubDate: pubDate ? parseDate(pubDate) : undefined,
                        author,
                        category,
                        image,
                    };
                });
            })
            .filter(Boolean)
    );

    return {
        title: channelTitle,
        link: channelUrl,
        item: items.filter(Boolean),
    };
}
