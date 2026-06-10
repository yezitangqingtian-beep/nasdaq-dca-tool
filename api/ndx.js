/**
 * Vercel Serverless Function - 获取纳斯达克100指数实时数据
 * 通过新浪财经接口代理
 * GET /api/ndx
 */

export default async function handler(req, res) {
    // CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        const response = await fetch('https://hq.sinajs.cn/list=gb_ndx', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://finance.sina.com.cn',
            },
            signal: AbortSignal.timeout(8000),
        });

        const text = await response.text();
        const match = text.match(/"([^"]+)"/);
        if (!match) throw new Error('Parse failed');

        const parts = match[1].split(',');
        res.status(200).json({
            name: parts[0],
            price: parseFloat(parts[1]),
            changePct: parseFloat(parts[2]),
            changeAmt: parseFloat(parts[4]),
            open: parseFloat(parts[5]),
            high: parseFloat(parts[6]),
            low: parseFloat(parts[7]),
            time: parts[3],
        });
    } catch (e) {
        res.status(502).json({ error: e.message });
    }
}
