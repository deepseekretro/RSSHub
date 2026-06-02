import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const FEED_API = 'https://assets.msn.com/service/MSN/Feed/me';
const DOC_API = 'https://assets.msn.com/content/v1/cms/api/amp/Document';
const APIKEY = '0QfOX3Vn51YCzitbLaRkTTBadtWpgTN8NZLW0C1SEM';
const IMG_REGEX = /<img data-reference="image" data-document-id="cms\/api\/amp\/image\/([A-Za-z0-9]+)">/g;

export const route: Route = {
    path: '/money/:locale?',
    categories: ['finance'],
    example: '/msn/money/zh-tw',
    parameters: {
        locale: 'Locale code (default: `zh-tw`). E.g. `zh-tw`, `en-us`, `zh-cn`, `ja-jp`',
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

    const commonQuery = {
        DisableTypeSerialization: true,
        apikey: APIKEY,
        cm: locale,
        contentType: 'article,video,slideshow',
        it: 'web',
        ocid: 'finance-verthp-feeds',
        queryType: 'myfeed',
        responseSchema: 'cardview',
        scn: 'ANON',
        wrapodata: false,
    };
    const headers = { Referer: 'https://www.msn.com/' };

    const [latest, news] = await Promise.all([
        ofetch(FEED_API, { query: { ...commonQuery, $top: 50, query: 'finance_latest', timeOut: 2000 }, headers }),
        ofetch(FEED_API, { query: { ...commonQuery, $top: 100, query: 'finance_news', infopaneCount: 5, timeOut: 3000 }, headers }),
    ]);

    const flatten = (data: any) => (data.subCards ?? []).flatMap((g: any) => g.subCards ?? [g]).filter((c: any) => c.type === 'article');

    // merge, deduplicate by id, latest first
    const seen = new Set<string>();
    const cards: any[] = [...flatten(latest), ...flatten(news)].filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
    });

    const items = await Promise.all(
        cards.map((card) =>
            cache.tryGet(card.id, async () => {
                const doc = await ofetch(`${DOC_API}/${card.id}`, {
                    headers: { Referer: 'https://www.msn.com/' },
                });
                const body = (doc.body as string | undefined)?.replace(IMG_REGEX, '<img src="https://img-s-msn-com.akamaized.net/tenant/amp/entityid/$1.img">') || '';
                return {
                    title: doc.title || doc._name,
                    link: doc.seo?.canonicalUrl || card.url || `https://www.msn.com/${locale}/money/topstories/ar-${card.id}`,
                    description: body,
                    pubDate: doc.displayPublishedDateTime ? parseDate(doc.displayPublishedDateTime) : undefined,
                    author: (doc.authors as { name: string }[] | undefined)?.map((a) => a.name).join(', ') || undefined,
                    category: (doc.keywords as string[] | undefined) || undefined,
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
