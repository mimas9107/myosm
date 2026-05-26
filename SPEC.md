---
name:             "SPEC.md"
description:      "台灣機車多點配送路徑規劃系統 — 技術規格文件"
created_date:     "2026/05/25 18:00:00"
modified_date:    "2026/05/26 16:00:00"
project_version:  "1.2.0"
document_version: "1.0.1"
agent_sign:       ['human/justin', 'antigravity/gemini-cli']
---

# SPEC — 技術規格文件

## 台灣機車多點配送路徑規劃系統 (MyOSM)

---

## 1. 系統概觀

本系統為一套**完全本地化、零雲端依賴**的多點路徑規劃工具，專為台灣白牌機車（50cc～150cc）的外送配送情境設計。

| 屬性 | 規格 |
|------|------|
| 授權方式 | 本地自架，無 API 費用 |
| 離線可用 | ✅（圖資一旦編譯，不需網路） |
| 作業系統 | Linux（已驗證：Ubuntu 22.04+） |
| 執行時期 | Docker、Node.js v18+ |

---

## 2. 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                        使用者瀏覽器                          │
│              http://localhost:3000 (Leaflet.js UI)           │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP fetch (Trip API)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│             OSRM Routing Engine (Docker)                     │
│              http://localhost:5000                           │
│  Algorithm: Multi-Level Dijkstra (MLD)                      │
│  Profile:   motorcycle.lua (台灣機車路權客製)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │ reads
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              osrm_data/ (編譯後圖資)                         │
│  taiwan-latest.osrm.* (27 個二進位檔)                        │
│  原始來源：OpenStreetMap Taiwan (geofabrik.de)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 元件規格

### 3.1 OSRM 路由引擎

| 項目 | 值 |
|------|----|
| 映像檔 | `ghcr.io/project-osrm/osrm-backend:latest` |
| 演算法 | MLD（Multi-Level Dijkstra） |
| 監聽埠 | `5000` |
| 容器名稱 | `osrm-motorcycle` |
| 圖資掛載 | `-v "${PWD}:/data"` |

**使用的 API 端點：**

| 端點 | 參數 | 說明 |
|------|------|------|
| `GET /trip/v1/motorcycle/{coords}` | `source=first`, `destination=any`, `roundtrip=true\|false`, `steps=true`, `geometries=geojson`, `overview=full` | TSP 最佳化多站配送（含 step-by-step 路段清單） |
| `GET /route/v1/motorcycle/{coords}` | `overview=false` | 兩點路線驗證 |

### 3.2 `motorcycle.lua` — 機車路權設定

基於 OSRM 官方 `car.lua` 進行客製，主要差異：

| 規則 | 原始 car.lua | motorcycle.lua |
|------|-------------|----------------|
| `motorway`（國道） | 允許 | **封鎖** |
| `motorway_link` | 允許 | **封鎖** |
| `motorcycle` access tag | 未處理 | **白名單允許** |
| `hov` 高乘載 | 允許 | **封鎖** |
| 市區道路（residential） | 25 km/h | **20 km/h** |
| 住宅巷弄（living_street） | 10 km/h | **10 km/h** |
| 省道（primary） | 65 km/h | **40 km/h** |

### 3.3 前端靜態伺服器 (`frontend/server.js`)

| 項目 | 規格 |
|------|------|
| 執行時期 | Node.js 原生模組（`http`、`fs`、`path`） |
| 外部依賴 | `dotenv`（環境變數載入） |
| 監聽位址 | 可透過 `.env` 設定（預設 `0.0.0.0:3000`） |
| 支援 MIME 類型 | `text/html`, `text/css`, `application/javascript`, `application/json` |

#### 設定檔系統

```env
HOST=0.0.0.0       # 監聽位址
PORT=3000          # 監聽埠號
NODE_ENV=development # 執行環境
```

| 設定檔 | 說明 |
|--------|------|
| `config.js` | dotenv 載入器，匯出唯讀設定物件 |
| `.env` | 實際環境變數（已加入 `.gitignore`） |
| `.env.example` | 範本供開發者複製使用 |

### 3.4 前端應用程式

**目錄結構：**

```
frontend/
├── html/index.html    # 頁面結構
├── css/style.css      # 自訂樣式（Glassmorphism 深色主題）
├── js/
│   ├── map.js         # 地圖初始化、圖層、自訂 Marker
│   ├── ui.js          # DOM 渲染輔助（預設點位、站點列表）
│   ├── routing.js     # OSRM Trip API 呼叫、路線繪製與樣式
│   ├── waypoints.js   # 站點 CRUD 管理
│   └── app.js         # 事件綁定與初始化入口
└── vendor/leaflet/    # Leaflet 1.9.4 本地資源
```

**使用的外部資源：**

| 資源 | 用途 |
|------|------|
| Leaflet.js 1.9.4（本地 `vendor/`） | 互動地圖渲染 |
| CartoDB Dark Matter（CDN Tile） | 深色底圖磚 |
| CartoDB Voyager（CDN Tile） | 亮色底圖磚 |
| OpenStreetMap（CDN Tile） | 標準底圖磚 |
| Google Fonts Outfit（CDN） | 字型 |
| Lucide Icons（CDN） | 圖示 |

**功能模組：**

| 模組 | 說明 |
|------|------|
| 站點管理 | 新增（點擊地圖）、刪除、拖曳更新座標 |
| 路線規劃 | 呼叫 OSRM Trip API（含 `steps=true`），解析 GeoJSON 路線並繪製 |
| 步驟解析 | `maneuvers.js`：16 種 maneuver type 對應表、合併規則、`parseSteps()` 解析器 |
| 步驟顯示 | 每步一列卡片，顯示圖示、動作、道路名稱、距離；`new name/straight` 自動合併 |
| 主題切換 | Dark / Voyager / OSM 三種底圖，含自動 Halo 對比描邊 |
| 色彩選取 | 路線顏色自訂（`<input type="color">`） |
| 返程模式 | `roundtrip=true/false` 動態切換 |
| 資訊面板 | 顯示總距離（km）、估算時間（分鐘）、TSP 最佳順序、路段動作清單 |

### 3.5 `frontend/js/maneuvers.js` — Maneuver 步驟解析器

| 項目 | 規格 |
|------|------|
| 職責 | 16 種 OSRM maneuver type 對應表 + 步驟解析 |
| 輸出模式 | 瀏覽器全域變數 + Node.js `module.exports` |
| 核心函式 | `parseSteps(legs)`、`isMergeable()`、`isBreakPoint()`、`buildNameChain()` |

#### Maneuver Type 對應表（覆蓋 16 種）

| type | modifier | 圖示 | 動作文字 | 可合併 |
|------|----------|------|----------|--------|
| `turn` | left/right/slight*/sharp* | ↰/↳ | 左轉/右轉/微左轉... | ❌ |
| `new name` | straight | ↑ | 續行 | ✅ |
| `new name` | left/right | ↰/↳ | 轉入 | ❌ |
| `continue` | straight | ↑ | 直行 | ✅ |
| `continue` | uturn | ↩ | 迴轉 | ❌ |
| `depart` | — | ➤ | 出發 | ❌（但可接受合併） |
| `arrive` | — | ● | 抵達 | ❌ |
| `end of road` | left/right | ⊥ | 路底左轉/右轉 | ❌ |
| `fork` | left/right | Y | 岔路靠左/靠右 | ❌ |
| `merge` | — | ═ | 匯入 | ❌ |
| `on ramp` / `off ramp` | — | ╰ / ╭ | 上/下匝道 | ❌ |
| `roundabout` / `rotary` | — | ◯ / ◎ | 圓環/轉盤第 N 出口 | ❌ |

#### 合併規則

僅 `new name/straight` 與 `continue/straight` 可向前合併，且僅合併入非斷點群組（`depart`、`new name`、`continue` 接受合併）。合併後距離累加、道路名稱以共同前綴串接。

---

## 4. 資料流程

### 4.1 路線規劃流程

```
使用者點擊地圖 → 新增 Waypoint (L.marker)
       ↓
按下「開始規劃路線」按鈕
       ↓
前端組裝座標字串：{lon1,lat1};{lon2,lat2};...
       ↓
fetch(`http://localhost:5000/trip/v1/motorcycle/{coords}?source=first
      &destination=any&roundtrip={bool}&steps=true&geometries=geojson&overview=full`)
       ↓
OSRM 回傳 JSON { code: "Ok", trips: [...], waypoints: [...] }
       ↓
解析 trips[0].geometry → L.geoJSON 繪製路線
解析 waypoints[].waypoint_index → 更新最佳配送順序
顯示 distance / duration 資訊
       ↓
parseSteps(trips[0].legs) → 合併 new name/straight → 渲染步驟卡片
```

### 4.2 OSRM 圖資編譯流程

```
taiwan-latest.osm.pbf  (OpenStreetMap 原始資料)
       ↓ osrm-extract (使用 motorcycle.lua 過濾路權)
taiwan-latest.osrm + *.osrm.restrictions + *.osrm.names 等
       ↓ osrm-partition (MLD 多層分區)
*.osrm.partition + *.osrm.cells + *.osrm.mldgr
       ↓ osrm-customize (套用速限與權重)
*.osrm.cell_metrics + *.osrm.datasource_names
       ↓
osrm-routed 讀取並啟動 HTTP 服務
```

---

## 5. 環境需求

### 5.1 執行環境

| 軟體 | 最低版本 | 用途 |
|------|----------|------|
| Docker | 20.10+ | 運行 OSRM 容器 |
| Node.js | 18.0+ | 前端靜態伺服器 |
| 磁碟空間 | ~5 GB | 台灣圖資 + 編譯輸出 |
| 記憶體 | ~2 GB | OSRM MLD 引擎 |

### 5.2 網路需求

| 情境 | 網路需求 |
|------|----------|
| 首次下載 OSM 圖資 | ✅ 需要（約 500 MB） |
| OSRM 圖資編譯 | ❌ 不需要 |
| 日常使用（路線規劃） | ❌ 不需要（Tile 除外） |
| 地圖底圖顯示 | ✅ 需要（CDN Tile） |

---

## 6. 已知限制

1. **臺灣範圍**：圖資僅涵蓋台灣本島及離島，無法規劃境外路線。
2. **地圖底圖**：底圖磚依賴外部 CDN，離線時底圖無法顯示（路線規劃仍可用）。
3. **TSP 最大站點**：OSRM Trip API 建議不超過 12 個站點（站點過多時運算時間增加）。
4. **機車分類**：目前設定針對 50cc～150cc 白牌機車，重型機車（黃牌/紅牌）可進一步調整 `motorcycle.lua` 時速。
