---
name:             "README.md"
description:      "專案主要說明文件，涵蓋快速上手、目錄結構與指令參考"
created_date:     "2026/05/25 17:00:00"
modified_date:    "2026/05/25 18:15:00"
project_version:  "1.0.0"
document_version: "1.0.0"
agent_sign:       ['human/justin', 'antigravity/gemini-cli']
---

# 🛵 台灣機車多點配送路徑規劃系統 (MyOSM)

專為台灣機車外送與多站配送設計的本地路徑規劃系統。整合 OSRM 開源路由引擎與客製機車路權設定，搭配 Leaflet.js 互動地圖前端，提供免費、離線可用的 TSP 最佳化配送順序規劃。

---

## ✨ 功能特色

- **機車專屬路權**：透過客製 `motorcycle.lua` 封鎖國道、調整各類道路時速，使路線與外送時間更符合台灣實際情況。
- **TSP 多點最佳化**：使用 OSRM Trip API 自動計算最短時間的配送順序，無需手動排列站點。
- **互動式地圖**：地圖點擊新增站點、拖曳標記更新位置、一鍵刪除站點。
- **地圖主題切換**：支援科技深色、人文亮色 (Voyager)、標準 OSM 三種底圖。
- **路線色彩自訂**：內建色彩選取器，隨主題自動套用最佳對比描邊（霓虹發光 / Road Halo）。
- **返程模式**：可切換「送完即止」或「返回起點」兩種模式。
- **零外部依賴**：前端伺服器以純 Node.js 原生模組實作，無需 `npm install`。

---

## 📁 專案目錄結構

```
myosm/
├── frontend/
│   ├── index.html        # 主要前端應用程式（Leaflet.js + Glassmorphism UI）
│   └── server.js         # 零依賴 Node.js 靜態伺服器（Port 3000）
├── osrm_data/
│   ├── taiwan-latest.osm.pbf       # 台灣 OSM 原始地理圖資
│   └── taiwan-latest.osrm.*        # OSRM 編譯輸出（27 個檔案）
├── motorcycle.lua         # 機車路權客製 Lua 設定檔
├── HIST_GEMINI.md         # Gemini AI 協作開發歷程紀錄
├── README.md              # 本文件
├── CHANGELOG.md           # 版本變更紀錄
├── SPEC.md                # 技術規格文件
└── MEMOIR.md              # 開發回顧文件
```

---

## 🚀 快速上手

### 前置需求

- Docker（用於運行 OSRM 引擎）
- Node.js（用於運行前端伺服器，v18+）

### 1. 啟動 OSRM 機車路由服務

```bash
# 於專案根目錄 (myosm/) 執行
docker run -d --name osrm-motorcycle -p 5000:5000 \
  -v "${PWD}:/data" \
  ghcr.io/project-osrm/osrm-backend:latest \
  osrm-routed --algorithm mld /data/osrm_data/taiwan-latest.osrm
```

驗證服務是否正常：
```bash
curl "http://localhost:5000/route/v1/motorcycle/121.517,25.047;121.525,25.048?overview=false"
# 預期回應：{"code":"Ok",...}
```

### 2. 啟動前端服務

```bash
node frontend/server.js
# 服務啟動於 http://localhost:3000
```

### 3. 開啟瀏覽器

前往 **[http://localhost:3000](http://localhost:3000)** 即可使用。

---

## 🔨 重新編譯 OSRM 圖資

若需更新台灣地圖資料或修改 `motorcycle.lua` 路權設定，請依序執行：

```bash
# 步驟 A：數據提取（過濾機車路權）
docker run --rm -t -v "${PWD}:/data" \
  ghcr.io/project-osrm/osrm-backend:latest \
  osrm-extract /data/osrm_data/taiwan-latest.osm.pbf -p /data/motorcycle.lua

# 步驟 B：圖形分區（優化多點矩陣計算）
docker run --rm -t -v "${PWD}:/data" \
  ghcr.io/project-osrm/osrm-backend:latest \
  osrm-partition /data/osrm_data/taiwan-latest.osrm

# 步驟 C：速限與權重客製化
docker run --rm -t -v "${PWD}:/data" \
  ghcr.io/project-osrm/osrm-backend:latest \
  osrm-customize /data/osrm_data/taiwan-latest.osrm
```

---

## 📡 API 端點參考

| 端點 | 說明 |
|------|------|
| `GET /route/v1/motorcycle/{lon,lat};{lon,lat}` | 兩點間最短路徑 |
| `GET /trip/v1/motorcycle/{coords}?source=first&roundtrip=false` | TSP 多點最佳化 |

---

## 🔗 相關技術

- [OSRM](http://project-osrm.org/) — Open Source Routing Machine
- [Leaflet.js](https://leafletjs.com/) — 開源互動地圖套件
- [OpenStreetMap](https://www.openstreetmap.org/) — 開放地理圖資
- [CartoDB Basemaps](https://carto.com/basemaps/) — 地圖底圖服務
