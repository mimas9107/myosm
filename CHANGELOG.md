---
name:             "CHANGELOG.md"
description:      "專案版本變更紀錄，為版本號的單一事實來源 (Source of Truth)"
created_date:     "2026/05/25 17:00:00"
modified_date:    "2026/05/26 18:00:00"
project_version:  "1.3.0"
document_version: "1.0.0"
agent_sign:       ['human/justin', 'antigravity/gemini-cli']
---

# CHANGELOG

本文件依照 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式撰寫，版本號遵循 `MAJOR.MINOR.PATCH` 規則。

---

## [1.3.0] — 2026/05/26

### 🪟 雙側欄可收合設計

### Added
- **左側控制面板收合**：點擊面板右緣按鈕可將左側面板向左滑入收起，僅留切換按鈕，釋放更多地圖畫面。
- **右側步驟 Dock 面板收合**：步驟清單移至獨立右側浮動面板，支援一鍵收合/展開，不干擾地圖瀏覽。
- **平板手機自適應**：右側面板在窄螢幕時改為底部滑出，收合按鈕位置自動對應。

### Changed
- **步驟清單遷移**：從左側面板內移至獨立右側 Dock，規劃結果不再需要滾動到底部才能查看路段動作。
- **清除全部行為**：按下清除全部時，右側面板內容一併清空，避免殘留舊資料。

---

## [1.2.0] — 2026/05/26

### 🗺️ Step-by-Step 路段動作清單

### Added
- **`frontend/js/maneuvers.js`**：完整 16 種 OSRM maneuver type 對應表，涵蓋 `turn`、`new name`、`continue`、`depart`、`arrive`、`roundabout`、`fork`、`merge` 等所有類型，含圖示、中文標籤與合併規則。
  - `parseSteps()`：將 OSRM Trip API 的 raw legs 解析為前端顯示用步驟陣列。
  - `buildNameChain()`：自動提取道路共同前綴的串接邏輯（e.g. `忠孝東路(一段→二段→三段)`）。
  - 雙模式導出（瀏覽器全域 + Node.js module.exports），便於測試與重用。
- **路段動作卡片 UI**：每步一列卡片，顯示圖示、動作文字、道路名稱、距離；`arrive` 步驟以綠色邊框標示站點抵達。支援合併顯示：`new name/straight` 與 `continue/straight` 自動合併為單一卡片。
- **`tests/test_parseSteps.js`**：14 項單元測試，覆蓋 maneuver mapping、合併規則、斷點分類、空值處理、跨 leg 邊界、站點標籤。

### Changed
- **`frontend/js/routing.js`**：Trip API URL 加入 `&steps=true`，成功後串接 `parseSteps()` → `renderStepList()`。
- **`frontend/js/ui.js`**：新增 `renderStepList()` 與 `formatDistance()`。
- **`frontend/html/index.html`**：新增 `#steps-container` DOM 錨點。

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
