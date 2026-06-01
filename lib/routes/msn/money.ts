import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const BASE = 'https://cdn.query.prod.cms.msn.com/cms/api/amp';
const IMG_REGEX = /<img data-reference="image" data-document-id="cms\/api\/amp\/image\/([A-Za-z0-9]+)">/g;

export const route: Route = {
    path: '/money/:locale?',
    categories: ['finance'],
    example: '/msn/money/zh-tw',
    parameters: {
        locale: 'Locale code (default: `zh-tw`). E.g. `zh-tw`, `en-us`, `ja-jp`',
    },
    name: 'Money News',
    maintainers: [],
    handler,
    radar: [
        {
            source: ['www.msn.com/:locale/money'],
            target: '/money/:locale',
        },
    ],
};

async function handler(ctx) {
    const locale = ctx.req.param('locale') || 'zh-tw';

    const list = await ofetch(`${BASE}/search`, {
        query: {
            $top: 30,
            $filter: `'_locale'eq'${locale}'and'labels.category.product'eq'finance'`,
            $orderby: '_lastPublishedDateTime desc',
        },
    });

    const items = await Promise.all(
        list.map((article) =>
            cache.tryGet(article._id, async () => {
                const data = await ofetch(`${BASE}/article/${article._id}`);
                const body = (data.body as string | undefined)?.replace(IMG_REGEX, '<img src="https://img-s-msn-com.akamaized.net/tenant/amp/entityid/$1.img">') || '';
                return {
                    title: data.title || data._name,
                    link: data.seo?.canonicalUrl || `https://www.msn.com/${locale}/money/topstories/ar-${article._id}`,
                    description: body,
                    pubDate: data.displayPublishedDateTime ? parseDate(data.displayPublishedDateTime) : undefined,
                    author: (data.authors as { name: string }[] | undefined)?.map((a) => a.name).join(', ') || undefined,
                    category: (data.keywords as string[] | undefined) || undefined,
                };
            })
        )
    );

    return {
        title: `MSN Money - ${locale}`,
        link: `https://www.msn.com/${locale}/money`,
        item: items,
    };
}
