import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';

const BASE = 'https://finance.yahoo.co.jp';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const route: Route = {
    path: '/stocks/us/ranking/:type?/:market?',
    categories: ['finance'],
    example: '/yahoo-finance-jp/stocks/us/ranking/tradingValue/all',
    parameters: {
        type: 'ランキング種類。`tradingValue`（売買代金、デフォルト）、`up`（値上がり率）、`down`（値下がり率）、`volume`（出来高）、`marketCapital`（時価総額）',
        market: '市場。`all`（全市場、デフォルト）',
    },
    name: '米国株ランキング',
    maintainers: ['deepseekretro'],
    radar: [
        {
            source: ['finance.yahoo.co.jp/stocks/us/ranking/:type'],
            target: '/stocks/us/ranking/:type',
        },
    ],
    handler,
};

function parseRows($: ReturnType<typeof load>) {
    return $('table tr')
        .toArray()
        .slice(1)
        .map((el) => {
            const $el = $(el);
            const tds = $el.find('td');
            const rank = $el.find('.Rank__text__kiKw').text().trim();
            const nameEl = $el.find('a').first();
            const name = nameEl.text().trim();
            const link = nameEl.attr('href') || '';
            const code = $el.find('li').eq(0).text().trim();
            const price = tds.eq(1).find('.StyledNumber__value__3rXW').eq(0).text().trim();
            const changeAbs = tds.eq(2).find('.StyledNumber__value__3rXW').eq(0).text().trim();
            const changePct = tds.eq(2).find('.StyledNumber__value__3rXW').eq(1).text().trim();
            const volume = tds.eq(3).find('.StyledNumber__value__3rXW').eq(0).text().trim();
            if (!rank || !name) {
                return null;
            }
            return { rank, name, link, code, price, changeAbs, changePct, volume };
        })
        .filter(Boolean);
}

async function handler(ctx) {
    const type = ctx.req.param('type') || 'tradingValue';
    const market = ctx.req.param('market') || 'all';

    const fetchPage = (page: number) =>
        ofetch(`${BASE}/stocks/us/ranking/${type}?market=${market}&company=off&page=${page}`, {
            responseType: 'text',
            headers: { 'User-Agent': UA },
        });

    const [html1, html2] = await Promise.all([fetchPage(1), fetchPage(2)]);
    const $1 = load(html1);
    const $2 = load(html2);

    const rows = [...parseRows($1), ...parseRows($2)].slice(0, 100);

    const rankingUrl = `${BASE}/stocks/us/ranking/${type}?market=${market}&company=off&page=1`;
    const feedTitle = $1('title').text().split(' - ')[0].trim();
    const today = new Date().toISOString().slice(0, 10);

    const tableRows = rows
        .map(
            ({ rank, name, link, code, price, changeAbs, changePct, volume }) =>
                `<tr><td>${rank}</td><td><a href="${link}">${name}</a>（${code}）</td><td>${price}</td><td>${changeAbs}（${changePct}%）</td><td>${volume}</td></tr>`
        )
        .join('');

    const description = `<table>
<thead><tr><th>順位</th><th>銘柄</th><th>取引値</th><th>前日比</th><th>出来高</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>`;

    return {
        title: feedTitle,
        link: rankingUrl,
        item: [
            {
                title: `${feedTitle} ${today}`,
                link: rankingUrl,
                description,
                guid: `${rankingUrl}#${today}`,
            },
        ],
    };
}
