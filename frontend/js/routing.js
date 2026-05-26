/* ═══════════════════════════════════════════
   OSRM Trip API 串接、路線繪製與樣式管理
   ═══════════════════════════════════════════ */

// 路線狀態
let routeLayers = [];        // 地圖上的路線圖層（[發光層, 核心層]）
let userRouteColor = '#1d4ed8';  // 使用者選擇的路線顏色
let isDarkTheme = false;     // 目前是否為深色底圖
let isColorCustomized = false; // 使用者是否手動修改過路線色彩

/** 清除地圖上所有路線並隱藏結果面板 */
function clearRoutes() {
    routeLayers.forEach(layer => map.removeLayer(layer));
    routeLayers = [];
    document.getElementById('result-section').style.display = 'none';
}

/**
 * 根據目前主題與使用者顏色，更新路線圖層樣式
 * 深色底圖 → 霓虹發光（Neon Glow）
 * 亮色底圖 → 白色 Halo 描邊（Road Halo）
 */
function updateRouteStyle() {
    if (routeLayers.length < 2) return;
    const glowLayer = routeLayers[0];
    const coreLayer = routeLayers[1];

    if (isDarkTheme) {
        glowLayer.setStyle({
            color: userRouteColor,
            weight: 12,
            opacity: 0.4
        });
        coreLayer.setStyle({
            color: '#ffffff',
            weight: 4,
            opacity: 1
        });
    } else {
        glowLayer.setStyle({
            color: '#ffffff',
            weight: 10,
            opacity: 0.85
        });
        coreLayer.setStyle({
            color: userRouteColor,
            weight: 5,
            opacity: 0.95
        });
    }
}

/**
 * 呼叫 OSRM Trip API 進行 TSP 最佳化運算
 * 成功後繪製路線、更新統計資料與配送順序時間軸
 */
async function calculateBestTrip() {
    if (waypoints.length < 2) {
        alert('請至少加入 1 個起點與 1 個配送點！');
        return;
    }

    // 顯示載入中遮罩
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
    loader.setAttribute('aria-hidden', 'false');

    // 組裝 OSRM 座標字串: "lon,lat;lon,lat;..."
    const coordsString = waypoints.map(wp => `${wp.lon},${wp.lat}`).join(';');

    const isRoundTrip = document.getElementById('toggle-roundtrip').checked;

    // source=first: 固定以第一個點為起點
    // destination=any: 終點由演算法最佳決定
    const osrmUrl = `http://localhost:5000/trip/v1/motorcycle/${coordsString}?source=first&destination=any&roundtrip=${isRoundTrip}&steps=true&geometries=geojson&overview=full`;

    try {
        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (data.code !== 'Ok') {
            alert('路徑規劃失敗：' + data.code);
            loader.style.display = 'none';
            loader.setAttribute('aria-hidden', 'true');
            return;
        }

        clearRoutes();

        // 萃取旅程統計資料
        const trip = data.trips[0];
        const distanceKm = (trip.distance / 1000).toFixed(2);
        const durationMin = Math.round(trip.duration / 60);

        // 更新卡片數值
        document.getElementById('val-distance').innerHTML = `${distanceKm}<span>公里</span>`;
        document.getElementById('val-duration').innerHTML = `${durationMin}<span>分鐘</span>`;

        // 依照 OSRM 回傳的 trips_index 排序，得到最佳配送順序
        const sortedWaypoints = [...data.waypoints].sort((a, b) => a.trips_index - b.trips_index);
        const timelineContainer = document.getElementById('result-timeline');
        timelineContainer.innerHTML = '';

        sortedWaypoints.forEach((wpInfo, index) => {
            const item = document.createElement('div');
            const isStartNode = wpInfo.waypoint_index === 0;
            item.className = `timeline-item ${isStartNode ? 'start' : 'dest'}`;

            const title = isStartNode ? '🏪 餐廳起點' : `📦 配送點 ${wpInfo.waypoint_index}`;
            const origWp = waypoints[wpInfo.waypoint_index];
            const coordsText = origWp ? `${origWp.lat.toFixed(5)}, ${origWp.lon.toFixed(5)}` : '';

            item.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <span class="timeline-title">${index + 1}. ${title}</span>
                    <span class="timeline-desc">座標: ${coordsText}</span>
                </div>
            `;
            timelineContainer.appendChild(item);
        });

        // 返程模式：最後補上返回起點節點
        if (isRoundTrip) {
            const returnItem = document.createElement('div');
            returnItem.className = 'timeline-item start';
            returnItem.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <span class="timeline-title">${sortedWaypoints.length + 1}. 🏪 返回起點</span>
                    <span class="timeline-desc">完成配送，返回起點餐廳</span>
                </div>
            `;
            timelineContainer.appendChild(returnItem);
        }

        // 顯示結果區塊
        document.getElementById('result-section').style.display = 'flex';

        // 繪製雙層路線：底層發光 + 上層核心線
        const glowLayer = L.geoJSON(trip.geometry).addTo(map);
        const coreLayer = L.geoJSON(trip.geometry).addTo(map);

        routeLayers.push(glowLayer, coreLayer);
        updateRouteStyle();

        // 自動縮放至路線範圍
        const bounds = glowLayer.getBounds();
        map.fitBounds(bounds.pad(0.15));

        // 解析 step-by-step 路段動作清單
        const stepGroups = parseSteps(data.trips[0].legs, sortedWaypoints);
        renderStepList(stepGroups);

    } catch (error) {
        console.error(error);
        alert('無法連線到 OSRM 伺服器，請確保 http://localhost:5000 正在運作中。');
    } finally {
        loader.style.display = 'none';
        loader.setAttribute('aria-hidden', 'true');
    }
}
