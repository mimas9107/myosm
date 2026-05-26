/* ═══════════════════════════════════════════
   設定載入器
   讀取 .env 檔案並提供唯讀設定物件
   優先順序: .env 檔案 > 程式碼預設值
   ═══════════════════════════════════════════ */

const path = require('path');
const dotenv = require('dotenv');

// 載入 .env（若檔案不存在則忽略）
dotenv.config({ path: path.join(__dirname, '.env') });

// 設定物件：從 process.env 取值，無則使用預設值
const config = {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
};

// 凍結設定物件，防止執行期被意外修改
Object.freeze(config);

module.exports = config;
