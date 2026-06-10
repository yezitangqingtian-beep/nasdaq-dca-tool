/**
 * 纳指定投工具 · 本地服务器
 * 提供静态文件服务 + API代理（解决CORS问题）
 * 启动：node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // ===== API代理接口 =====
    if (pathname === '/api/proxy') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        try {
            const response = await fetch(decodeURIComponent(targetUrl), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://finance.sina.com.cn',
                    'Accept': '*/*',
                },
                signal: AbortSignal.timeout(8000),
            });
            const text = await response.text();
            const ct = response.headers.get('content-type') || 'text/plain';
            res.writeHead(200, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' });
            res.end(text);
        } catch (e) {
            res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // ===== Nasdaq NDX指数实时数据 =====
    if (pathname === '/api/ndx') {
        try {
            const raw = await fetch('https://hq.sinajs.cn/list=gb_ndx', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://finance.sina.com.cn',
                },
                signal: AbortSignal.timeout(5000),
            });
            const text = await raw.text();
            // 解析: var hq_str_gb_ndx="name,price,chg%,datetime,chgAmt,open,high,low,..."
            const match = text.match(/"([^"]+)"/);
            if (!match) throw new Error('Parse failed');
            const parts = match[1].split(',');
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({
                name: parts[0],
                price: parseFloat(parts[1]),
                changePct: parseFloat(parts[2]),
                changeAmt: parseFloat(parts[4]),
                open: parseFloat(parts[5]),
                high: parseFloat(parts[6]),
                low: parseFloat(parts[7]),
                time: parts[3],
            }));
        } catch (e) {
            res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // ===== QQQ历史数据（用于算均线） =====
    if (pathname === '/api/qqq-historical') {
        try {
            // 需要fromdate/todate参数才能获取完整数据
            const today = new Date();
            const toDate = today.toISOString().slice(0, 10);
            const fromDate = new Date(today - 120 * 86400000).toISOString().slice(0, 10);
            const raw = await fetch(
                `https://api.nasdaq.com/api/quote/QQQ/historical?assetclass=etf&fromdate=${fromDate}&todate=${toDate}&limit=200`,
                {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(8000),
                }
            );
            const data = await raw.json();
            const rows = data?.data?.tradesTable?.rows || [];
            const closes = rows.map(r => parseFloat(r.close)).filter(v => v > 0).reverse();

            if (closes.length < 5) throw new Error('Insufficient data');

            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ closes, count: closes.length }));
        } catch (e) {
            res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // ===== 静态文件服务 =====
    const filePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const fullPath = path.join(__dirname, filePath);
    const ext = path.extname(fullPath);

    try {
        const content = fs.readFileSync(fullPath);
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
        });
        res.end(content);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`\n  🚀 纳指定投工具已启动`);
    console.log(`  ─────────────────────────────`);
    console.log(`  🖥  本地地址: http://localhost:${PORT}`);
    console.log(`  🌐 外网地址: http://YOUR_IP:${PORT}`);
    console.log(`  ─────────────────────────────`);
    console.log(`  按 Ctrl+C 停止服务器\n`);
});
