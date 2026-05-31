import { decodeHTML } from 'entities';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/news/:category?',
    categories: ['finance'],
    example: '/cnyes/news/headline',
    parameters: {
        category: 'Category slug (default: `headline`). Options: `headline`, `headline_ai`, `news24h`, `newsMarco`, `hotai`, `stock_report`, `topTopics`',
    },
    name: '新聞分類',
    maintainers: [],
    handler,
};

const CATEGORY_NAMES: Record<string, string> = {
    headline: '頭條新聞',
    headline_ai: 'AI頭條',
    headline_all: '所有頭條',
    news24h: '24小時新聞',
    newsMarco: '總經新聞',
    hotai: '熱門AI',
    stock_report: '法人報告',
    topTopics: '熱門話題',
};

async function handler(ctx) {
    const category = ctx.req.param('category') || 'headline';
    const data = await ofetch(`https://api.cnyes.com/media/api/v1/newslist/category/${category}`, {
        query: { limit: 30, page: 1 },
        headers: { Accept: 'application/json' },
    });

    const items = data.items.data.map((item) => {
        const cover = item.coverSrc?.l?.src || item.coverSrc?.m?.src;
        const body = decodeHTML(item.content || '');
        const description = cover ? `<img src="${cover}"/><br/>${body}` : body;

        return {
            title: item.title,
            link: `https://news.cnyes.com/news/id/${item.newsId}`,
            description,
            pubDate: parseDate(item.publishAt * 1000),
            author: item.columnists?.name || item.source || undefined,
            category: item.keyword,
        };
    });

    return {
        title: `鉅亨網 - ${CATEGORY_NAMES[category] ?? category}`,
        link: `https://news.cnyes.com/news/cat/${category}`,
        item: items,
    };
}
