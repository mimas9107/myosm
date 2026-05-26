/* ═══════════════════════════════════════════
   前端靜態檔案伺服器
   原生 Node.js http 模組，支援 .env 設定
   ═══════════════════════════════════════════ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const PUBLIC_DIR = __dirname; // 服務 frontend 資料夾下的所有靜態檔案

// 支援的 MIME 類型對照表
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // 只允許 GET 請求
    if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Method Not Allowed');
        return;
    }

    // 解析檔案路徑：去除 query string，根路徑指向 index.html
    let safeUrl = req.url.split('?')[0];
    if (safeUrl === '/') {
        safeUrl = '/html/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, safeUrl);

    // 路徑穿越攻擊防護：確保解析後的路徑仍在 PUBLIC_DIR 內
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Forbidden');
        return;
    }

    // 檢查檔案是否存在並為一般檔案
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('404 Not Found');
            return;
        }

        // 根據副檔名決定 Content-Type
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);

        // 以串流方式讀取檔案，減少記憶體佔用
        const stream = fs.createReadStream(filePath);
        stream.on('error', (streamErr) => {
            console.error(streamErr);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.end('Internal Server Error');
            }
        });
        stream.pipe(res);
    });
});

// 啟動伺服器（位址與埠號由 config 或 .env 決定）
server.listen(config.port, config.host, () => {
    const displayHost = config.host === '0.0.0.0' ? 'localhost' : config.host;
    console.log(`==================================================`);
    console.log(`🚀 台灣機車路徑規劃前端伺服器已啟動！`);
    console.log(`   環境: ${config.nodeEnv}`);
    console.log(`   位址: http://${displayHost}:${config.port}`);
    console.log(`==================================================`);
});
