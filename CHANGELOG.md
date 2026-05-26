---
name:             "CHANGELOG.md"
description:      "專案版本變更紀錄，為版本號的單一事實來源 (Source of Truth)"
created_date:     "2026/05/25 17:00:00"
modified_date:    "2026/05/26 12:15:00"
project_version:  "1.1.0"
document_version: "1.0.0"
agent_sign:       ['human/justin', 'antigravity/gemini-cli']
---

# CHANGELOG

本文件依照 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式撰寫，版本號遵循 `MAJOR.MINOR.PATCH` 規則。

---

## [1.1.0] — 2026/05/26

### 🏗️ 前端重構與基礎設施強化

### Changed
- **前端架構重構**：將 `index.html` 內的 `<style>` 與 `<script>` 拆分為獨立 `style.css` 與 `app.js`，並進一步將 JS 模組化為 `map.js`、`ui.js`、`routing.js`、`waypoints.js`、`app.js` 五個功能模組。
- **目錄結構整理**：按檔案類型分為 `html/`、`css/`、`js/` 三個子目錄，提升專案可維護性。
- **Leaflet 本地化**：從 CDN 下載 Leaflet 1.9.4（JS + CSS + images）至 `vendor/leaflet/`，減少執行期外部網路依賴。
- **設定檔系統**：新增 `config.js` + `.env` 設定檔機制，支援 `HOST`、`PORT`、`NODE_ENV` 等變數，開發者可透過 `.env` 覆蓋預設值（預設: `0.0.0.0:3000`）。
- **`server.js`** 改用 `config.js` 讀取設定，並於啟動 log 顯示當前環境與位址。

### Added
- `frontend/config.js`：dotenv 設定載入器
- `frontend/.env`、`frontend/.env.example`：環境設定檔
- `frontend/package.json`：正式納入 npm 管理（dotenv 相依）
- `frontend/vendor/leaflet/`：Leaflet 1.9.4 本地資源

---

## [1.0.0] — 2026/05/25

### 🏗️ 專案初始化
- 建立台灣機車多點配送路徑規劃專案基礎架構。
- 確立專案目錄結構：`frontend/`、`osrm_data/`、`motorcycle.lua`。

### Added
- **`motorcycle.lua`**：基於 OSRM 官方 `car.lua` 客製台灣白牌機車路權設定檔。
  - 強制封鎖 `motorway`（國道／高速公路）。
  - 加入 `motorcycle` 標籤路權白名單，移除 `hov` 高乘載車道。
  - 調整市區、住宅區、省道基礎時速（10～40 km/h）使外送時間估算更精準。
- **OSRM 機車導航引擎**：使用 Docker 完成台灣全島圖資的 extract → partition → customize 編譯流程，服務監聽 `http://localhost:5000`。
- **`frontend/server.js`**：零依賴原生 Node.js 靜態檔案伺服器，監聽 `http://localhost:3000`。
- **`frontend/index.html`**：完整前端應用程式，功能包含：
  - Leaflet.js + CartoDB / OSM 地圖渲染（三種主題切換）。
  - OSRM Trip API 串接，自動計算 TSP 最佳配送順序。
  - 地圖點擊新增站點、標記拖曳更新座標、站點刪除管理。
  - 路線自訂色彩選取器與智慧對比描邊（Road Halo / Neon Glow）。
  - 返程模式開關（`roundtrip=true/false`）。
  - 玻璃擬態深色風格控制面板（Glassmorphism UI）。
- **`osrm_data/`**：地理圖資專用目錄，存放台灣 OSM 原始圖資與 27 個 OSRM 編譯輸出檔。
- **`HIST_GEMINI.md`**：記錄與 Gemini Web 版建立此專案的完整對話歷程。

### Documentation
- 新增 `README.md`、`CHANGELOG.md`、`SPEC.md`、`MEMOIR.md` 專案標準文件。
