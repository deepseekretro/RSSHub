import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/category/:slug?',
    categories: ['finance'],
    example: '/stockfeel/category/stocks-futures',
    parameters: {
        slug: '分類 slug（預設 `stocks-futures`）。可選：`stocks-futures` · `investment-strategy` · `macro-economy` · `fund` · `financial-planning` · `business-strategy-2` · `alternative-investment`',
    },
    name: '分類文章',
    maintainers: [],
    handler,
};

const CATEGORY_NAMES: Record<string, string> = {
    'stocks-futures': '股票期貨',
    'investment-strategy': '投資策略',
    'macro-economy': '宏觀經濟',
    fund: '基金實務',
    'financial-planning': '理財規劃',
    'business-strategy-2': '商業策略',
    'alternative-investment': '另類投資',
};

async function handler(ctx) {
    const slug = ctx.req.param('slug') || 'stocks-futures';

    const [cats] = await ofetch(`https://www.stockfeel.com.tw/wp-json/wp/v2/categories`, {
        query: { slug, per_page: 1, _fields: 'id,name' },
    });

    const posts = await ofetch(`https://www.stockfeel.com.tw/wp-json/wp/v2/posts`, {
        query: { categories: cats.id, per_page: 20, _embed: 'wp:featuredmedia' },
    });

    return {
        title: `StockFeel 股感 - ${CATEGORY_NAMES[slug] ?? cats.name}`,
        link: `https://www.stockfeel.com.tw/category/allpost/${slug}/`,
        item: posts.map((p) => {
            const img = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
            const description = img ? `<img src="${img}"/><br/>${p.content.rendered}` : p.content.rendered;
            return {
                title: p.title.rendered,
                link: p.link,
                description,
                pubDate: parseDate(p.date),
            };
        }),
    };
}
