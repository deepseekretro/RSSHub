import type { Route } from '@/types';
import { parseDate } from '@/utils/parse-date';
import ofetch from '@/utils/ofetch';

const BASE = 'https://www.wealth.com.tw';
const IMG_BASE = 'https://static.wealth.com.tw';

const GQL_QUERY = `query Articles($offset:Int,$limit:Int,$type:ArticleType,$viewOrderType:ArticleViewOrderType){
  articles(offset:$offset limit:$limit type:$type viewOrderType:$viewOrderType){
    id title subtitle content authors{name} categories{name} hashtags{name} releasedAt
  }
}`;

// Convert Slate.js JSON nodes to HTML
function slateToHtml(nodes: any[]): string {
    return nodes.map((node) => nodeToHtml(node)).join('');
}

function nodeToHtml(node: any): string {
    if (node.text !== undefined) {
        let t = node.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        if (node.bold) {
            t = `<strong>${t}</strong>`;
        }
        if (node.italic) {
            t = `<em>${t}</em>`;
        }
        return t;
    }
    const children = node.children ? slateToHtml(node.children) : '';
    switch (node.type) {
        case 'p':
            return `<p>${children}</p>`;
        case 'heading':
            return `<h${node.level ?? 2}>${children}</h${node.level ?? 2}>`;
        case 'link':
            return `<a href="${node.url}">${children}</a>`;
        case 'image':
            return `<img src="${node.hosting === 'GCLOUD_STORAGE' ? `${IMG_BASE}/${node.src}` : node.src}" alt="">`;
        case 'image_figure':
            return `<figure>${children}</figure>`;
        case 'image_caption':
            return children ? `<figcaption>${children}</figcaption>` : '';
        default:
            return children;
    }
}

export const route: Route = {
    path: '/articles',
    categories: ['finance'],
    example: '/wealth/articles',
    name: '最新文章',
    maintainers: [],
    handler,
    radar: [
        {
            source: ['www.wealth.com.tw/lists/articles'],
            target: '/articles',
        },
    ],
};

async function handler() {
    const data = await ofetch(`${BASE}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Referer: `${BASE}/lists/articles` },
        body: {
            operationName: 'Articles',
            variables: { offset: 0, limit: 20, type: 'ARTICLE', viewOrderType: null },
            query: GQL_QUERY,
        },
    });

    const articles = data.data.articles;

    const items = articles.map((article: any) => ({
        title: article.title,
        link: `${BASE}/articles/${article.id}`,
        description: article.subtitle ? `<p>${article.subtitle}</p>${slateToHtml(JSON.parse(article.content))}` : slateToHtml(JSON.parse(article.content)),
        pubDate: parseDate(article.releasedAt),
        author: article.authors?.map((a: any) => a.name).join(', ') || undefined,
        category: [...(article.categories?.map((c: any) => c.name) ?? []), ...(article.hashtags?.map((h: any) => h.name) ?? [])],
    }));

    return {
        title: '財富雜誌 - 最新文章',
        link: `${BASE}/lists/articles`,
        item: items,
    };
}
