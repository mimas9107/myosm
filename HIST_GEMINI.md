# 台灣機車多點配送與路徑規劃實作紀錄 (HIST_GEMINI.md)

本文件紀錄了從零開始架設台灣專屬機車導航引擎（OSRM），到結合前端 Leaflet.js 地圖與 Trip API 進行多點外送路徑最佳化的完整實作過程。

---

## 📅 開發階段與架構方向
1. **後端引擎**：採用開源、免費且可本地架設的 OSRM (Open Source Routing Machine)。因其預設無機車模式，透過修改 Lua Profile 客製化台灣機車路權。
2. **多點演算法**：利用 OSRM 的 **Trip API** 解決旅行推銷員問題（TSP），自動計算最佳拜訪順序。
3. **前端視覺化**：本著免費開源原則，不採用 Google Maps，改用 **Leaflet.js** 搭配 **OpenStreetMap (OSM)** 進行地圖渲染與路線繪製。
4. **進階擴充彈性**：預留未來串接 VROOM 引擎的空間，以支援「抵達時間限制（Time Windows）」等動態過濾需求（預設不啟用）。

---

## 🛠️ 第一階段：後端機車導航引擎架設

### 1. 建立機車專用 Lua 設定檔 (`motorcycle.lua`)
基於 OSRM 官方的 `car.lua` 進行修改，針對台灣「白牌/綠牌機車」的路權與速度限制進行客製化：

* **車體尺寸優化**：縮小車寬與車高，避免窄巷被錯誤封鎖。
* **路權白名單**：加入 `motorcycle` 標籤，移除 `hov`（高乘載車道）。
* **強制避開禁行路段**：將 `motorway`（高速公路/國道）加入 `avoid` 清單。
* **時速與權重微調**：調低市區、住宅區、省道一般道路的基礎時速（10 ~ 40 km/h），並將高速公路時速設為 0 以徹底阻斷，使外送時間預估更精準。

### 2. 圖資下載與地圖編譯
下載台灣區的原始圖資 `taiwan-latest.osm.pbf`，存放於 `osrm_data/` 子目錄內，並透過 Docker 映像檔 `ghcr.io/project-osrm/osrm-backend:latest` 依序執行以下三大編譯步驟：

> **注意**：執行前請確認工作目錄為專案根目錄 (`myosm/`)，所有圖資及編譯產出均位於 `osrm_data/` 目錄下。

```bash
# 步驟 A：數據提取 (過濾機車路權)
# 輸入：osrm_data/taiwan-latest.osm.pbf + motorcycle.lua
# 輸出：osrm_data/taiwan-latest.osrm.* 系列編譯檔
docker run --rm -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend:latest osrm-extract /data/osrm_data/taiwan-latest.osm.pbf -p /data/motorcycle.lua

# 步驟 B：圖形分區 (優化多點矩陣計算)
docker run --rm -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend:latest osrm-partition /data/osrm_data/taiwan-latest.osrm

# 步驟 C：速限與權重客製化
docker run --rm -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend:latest osrm-customize /data/osrm_data/taiwan-latest.osrm
```

### 3. 啟動 API 服務
編譯完成後，背景執行 OSRM 路由伺服器（監聽 `5000` 端口）：
```bash
docker run -d --name osrm-motorcycle -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend:latest osrm-routed --algorithm mld /data/osrm_data/taiwan-latest.osrm
```

> **重啟服務**：若需停止舊容器並以新路徑重啟，請執行：
> ```bash
> docker stop osrm-motorcycle && docker rm osrm-motorcycle
> docker run -d --name osrm-motorcycle -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend:latest osrm-routed --algorithm mld /data/osrm_data/taiwan-latest.osrm
> ```

* **測試成功回應範例**：
  呼叫 `http://localhost:5000/route/v1/motorcycle/{lon,lat};{lon,lat}` 後，系統成功回傳 `{"code":"Ok"}` 以及準確的距離（Distance）與時間（Duration）數據。

---

## 🎨 第二階段：JavaScript 前端網頁串接 (多點配送)

為了解決外部不穩定 CDN 導致的 `nosniff` 安全封鎖與載入失敗問題，建議直接將 Leaflet 套件下載至本地目錄（`/frontend`）中開發。

### 1. 本地環境準備
```bash
cd /home/mimas/projects/myosm/frontend/
curl -O https://cloudflare.com
curl -O https://cloudflare.com
```

### 2. 前端完整程式碼 (`index.html`)

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>機車多點配送路徑規劃</title>
    <!-- 讀取同目錄下的本地 Leaflet 樣式 -->
    <link rel="stylesheet" href="./leaflet.css" />
    <style>
        body { margin: 0; padding: 0; font-family: sans-serif; }
        #map { height: 100vh; width: 100%; }
        #info-panel {
            position: absolute; top: 10px; right: 10px; z-index: 1000;
            background: white; padding: 15px; border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2); max-width: 300px;
        }
        h3 { margin-top: 0; }
    </style>
</head>
<body>

    <div id="info-panel">
        <h3>配送規劃資訊</h3>
        <div id="result">計算中...</div>
    </div>

    <div id="map"></div>

    <!-- 讀取同目錄下的本地 Leaflet 腳本 -->
    <script src="./leaflet.js"></script>

    <script>
        // 1. 初始化地圖（預設台北車站）
        const map = L.map('map').setView([25.047, 121.517], 14);

        // 2. 載入 OSM 免費圖磚
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 3. 多點外送座標 [經度 lon, 緯度 lat]
        const deliveryPoints = [
            [121.517, 25.047], // 台北車站 (起點：餐廳/倉庫)
            [121.544, 25.042], // 配送點 A
            [121.564, 25.033], // 配送點 B
            [121.519, 25.026]  // 配送點 C
        ];

        // 4. 繪製地圖標記 (Leaflet 座標順序為 [lat, lon])
        deliveryPoints.forEach((coord, index) => {
            const label = index === 0 ? `🏪 起點` : `📦 配送點 ${index}`;
            L.marker([coord[1], coord[0]]).addTo(map).bindPopup(label).openPopup();
        });

        // 5. 串接 OSRM Trip API 進行 TSP 最佳化排序
        async function calculateBestTrip() {
            const coordsString = deliveryPoints.map(c => c.join(',')).join(';');
            
            // 參數：source=first (固定第一個點出發), destination=any (送完最後一點即結束，不返回起點)
            const osrmUrl = `http://localhost:5000/trip/v1/motorcycle/${coordsString}?source=first&destination=any&geometries=geojson&overview=full`;

            try {
                const response = await fetch(osrmUrl);
                const data = await response.json();

                if (data.code !== 'Ok') {
                    document.getElementById('result').innerText = '路徑規劃失敗：' + data.code;
                    return;
                }

                const trip = data.trips[0]; // 取得最佳路徑
                const distanceKm = (trip.distance / 1000).toFixed(2);
                const durationMin = Math.round(trip.duration / 60);

                // 排序並解析 OSRM 計算出的最佳配送順序
                const bestOrder = data.waypoints
                    .sort((a, b) => a.trips_index - b.trips_index)
                    .map(wp => wp.waypoint_index === 0 ? "起點" : `配送點${wp.waypoint_index}`)
                    .join(' ➡️ ');

                document.getElementById('result').innerHTML = `
                    <p><b>📐 總外送里程：</b> ${distanceKm} 公里</p>
                    <p><b>⏱️ 預估總車程：</b> ${durationMin} 分鐘</p>
                    <p><b>🗺️ 最佳外送順序：</b><br>${bestOrder}</p>
                `;

                // 6. 將機車路線 (GeoJSON) 渲染至地圖
                const routeLayer = L.geoJSON(trip.geometry, {
                    style: { color: '#3388ff', weight: 6, opacity: 0.8 }
                }).addTo(map);

                map.fitBounds(routeLayer.getBounds());

            } catch (error) {
                console.error(error);
                document.getElementById('result').innerText = '無法連線到 OSRM 伺服器';
            }
        }

        calculateBestTrip();
    </script>
</body>
</html>
```

### 3. 執行本地服務（解決 CORS 跨網域限制）
避免直接用瀏覽器開 `file:///` 協定觸發安全阻擋，請在前端目錄快速建立本地伺服器：
```bash
python3 -m http.server 8000
```
接著在瀏覽器輸入 `http://localhost:8000/index.html` 即可看到完美運作的台灣機車配送地圖。

---

## 📈 後續擴充建議
- **路網校正**：若在測試時發現某些特定高架橋、禁行機車道仍會被排入，需進一步調整 `motorcycle.lua` 中的 `way_handlers` 或特定標籤排除邏輯。
- **時間窗口功能（Time Windows）**：若未來業務需求將「指定時間前送達」設為必選過濾條件，建議引入與 OSRM 高度整合的 **VROOM** 演算法服務器來做外送訂單的派發調度。

