----
name:             "SPEC.md"
description:      "台灣機車多點配送路徑規劃系統 — 技術規格文件"
created_date:     "2026/05/25 18:00:00"
modified_date:    "2026/05/25 18:18:00"
project_version:  "1.0.0"
document_version: "1.0.0"
agent_sign:       ['human/justin', 'antigravity/gemini-cli']
----

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
| `GET /trip/v1/motorcycle/{coords}` | `source=first`, `destination=last`, `roundtrip=true\|false`, `geometries=geojson`, `overview=full` | TSP 最佳化多站配送 |
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
| 外部依賴 | **無**（零 npm 套件） |
| 監聽埠 | `3000` |
| 支援 MIME 類型 | `text/html`, `text/css`, `application/javascript`, `application/json` |

### 3.4 前端應用程式 (`frontend/index.html`)

**使用的外部 CDN 資源：**

| 函式庫 | 版本 | 用途 |
|--------|------|------|
| Leaflet.js | 1.9.4 | 互動地圖渲染 |
| CartoDB Dark Matter | — | 深色底圖磚 |
| CartoDB Voyager | — | 亮色底圖磚 |
| OpenStreetMap | — | 標準底圖磚 |

**功能模組：**

| 模組 | 說明 |
|------|------|
| 站點管理 | 新增（點擊地圖）、刪除、拖曳更新座標 |
| 路線規劃 | 呼叫 OSRM Trip API，解析 GeoJSON 路線並繪製 |
| 主題切換 | Dark / Voyager / OSM 三種底圖，含自動 Halo 對比描邊 |
| 色彩選取 | 路線顏色自訂（`<input type="color">`） |
| 返程模式 | `roundtrip=true/false` 動態切換 |
| 資訊面板 | 顯示總距離（km）、估算時間（分鐘）、TSP 最佳順序 |

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
      &destination=last&roundtrip={bool}&geometries=geojson&overview=full`)
       ↓
OSRM 回傳 JSON { code: "Ok", trips: [...], waypoints: [...] }
       ↓
解析 trips[0].geometry → L.geoJSON 繪製路線
解析 waypoints[].waypoint_index → 更新最佳配送順序
顯示 distance / duration 資訊
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
