/**
 * Vercel Serverless Function - 获取QQQ历史数据
 * 用于计算MA20/MA60均线
 * GET /api/qqq-historical
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        const today = new Date();
        const toDate = today.toISOString().slice(0, 10);
        const fromDate = new Date(today - 120 * 86400000).toISOString().slice(0, 10);

        const response = await fetch(
            `https://api.nasdaq.com/api/quote/QQQ/historical?assetclass=etf&fromdate=${fromDate}&todate=${toDate}&limit=200`,
            {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(10000),
            }
        );

        const data = await response.json();
        const rows = data?.data?.tradesTable?.rows || [];
        const closes = rows.map(r => parseFloat(r.close)).filter(v => v > 0).reverse();

        if (closes.length < 5) throw new Error('Insufficient data');

        res.status(200).json({ closes, count: closes.length });
    } catch (e) {
        res.status(502).json({ error: e.message });
    }
}
