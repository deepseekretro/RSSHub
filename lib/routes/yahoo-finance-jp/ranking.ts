import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';

const BASE = 'https://finance.yahoo.co.jp';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Ranking type options:
// tradingValueHigh  売買代金上位
// priceChangeRatioHigh  値上がり率上位
// priceChangeRatioLow   値下がり率上位
// volumeHigh  出来高上位
export const route: Route = {
    path: '/stocks/ranking/:type?/:market?',
    categories: ['finance'],
    example: '/yahoo-finance-jp/stocks/ranking/tradingValueHigh/all',
    parameters: {
        type: 'ランキング種類。`tradingValueHigh`（売買代金、デフォルト）、`priceChangeRatioHigh`（値上がり率）、`priceChangeRatioLow`（値下がり率）、`volumeHigh`（出来高）',
        market: '市場。`all`（全市場、デフォルト）、`tse`（東証）など',
    },
    name: '株式ランキング',
    maintainers: ['deepseekretro'],
    radar: [
        {
            source: ['finance.yahoo.co.jp/stocks/ranking/:type'],
            target: '/stocks/ranking/:type',
        },
    ],
    handler,
};

function parseRows($: ReturnType<typeof load>) {
    return $('tr.RankingTable__row__1Gwp')
        .toArray()
        .map((el) => {
            const $el = $(el);
            const tds = $el.find('td');
            const rank = $el.find('th').first().text().trim();
            const nameEl = $el.find('a').first();
            const name = nameEl.text().trim();
            const link = nameEl.attr('href') || '';
            const lis = $el.find('li');
            const code = lis.eq(0).text().trim();
            const market = lis.eq(1).text().trim();
            const price = tds.eq(1).find('.StyledNumber__value__3rXW').first().text().trim();
            const changeAbs = tds.eq(2).find('.StyledNumber__value__3rXW').eq(0).text().trim();
            const changePct = tds.eq(2).find('.StyledNumber__value__3rXW').eq(1).text().trim();
            const volume = tds.eq(3).find('.StyledNumber__value__3rXW').first().text().trim();
            return { rank, name, link, code, market, price, changeAbs, changePct, volume };
        });
}

async function handler(ctx) {
    const type = ctx.req.param('type') || 'tradingValueHigh';
    const market = ctx.req.param('market') || 'all';

    const fetchPage = (page: number) =>
        ofetch(`${BASE}/stocks/ranking/${type}?market=${market}&page=${page}`, {
            responseType: 'text',
            headers: { 'User-Agent': UA },
        });

    const [html1, html2] = await Promise.all([fetchPage(1), fetchPage(2)]);
    const $1 = load(html1);
    const $2 = load(html2);

    const rows = [...parseRows($1), ...parseRows($2)].slice(0, 100);

    const rankingUrl = `${BASE}/stocks/ranking/${type}?market=${market}&page=1`;
    const feedTitle = $1('title').text().split(' - ')[0].trim();

    const today = new Date().toISOString().slice(0, 10);

    const tableRows = rows
        .map(
            ({ rank, name, link, code, market: mkt, price, changeAbs, changePct, volume }) =>
                `<tr><td>${rank}</td><td><a href="${link}">${name}</a>（${code}）${mkt}</td><td>${price}</td><td>${changeAbs}（${changePct}%）</td><td>${volume}</td></tr>`
        )
        .join('');

    const description = `<table>
<thead><tr><th>順位</th><th>銘柄</th><th>取引値</th><th>前日比</th><th>売買代金</th></tr></thead>
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
