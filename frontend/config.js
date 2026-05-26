const path = require('path');
const dotenv = require('dotenv');

// 載入 .env（若存在）
dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
};

Object.freeze(config);

module.exports = config;
