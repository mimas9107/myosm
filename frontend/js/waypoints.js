/* ═══════════════════════════════════════════
   站點（Waypoint）CRUD 管理
   ═══════════════════════════════════════════ */

// 目前所有站點的資料陣列
let waypoints = [];

/**
 * 在地圖上新增一個站點
 * @param {number} lat - 緯度
 * @param {number} lon - 經度
 * @param {boolean} isStart - 是否為起點
 */
function addWaypoint(lat, lon, isStart = false) {
    const id = Math.random().toString(36).substr(2, 9);
    const index = waypoints.length;

    // 建立可拖曳的 Leaflet 標記
    const marker = L.marker([lat, lon], {
        icon: createCustomIcon(index, isStart),
        draggable: true
    }).addTo(map);

    const label = isStart ? `<strong>🏪 起點</strong><br>外送餐廳 / 倉庫` : `<strong>📦 配送點 ${index}</strong><br>台灣機車外送目標點`;
    marker.bindPopup(label);

    // 拖曳結束時更新座標
    marker.on('dragend', function (event) {
        const position = marker.getLatLng();
        updateWaypointPosition(id, position.lat, position.lng);
    });

    waypoints.push({ id, lat, lon, marker, isStart });

    renderWaypointsList();
    clearRoutes();     // 站點變動需清除舊路線
    updateMarkersUI(); // 重新對齊編號
}

/**
 * 更新指定站點的座標（拖曳後呼叫）
 * @param {string} id - 站點唯一識別碼
 * @param {number} lat - 新緯度
 * @param {number} lon - 新經度
 */
function updateWaypointPosition(id, lat, lon) {
    const wp = waypoints.find(w => w.id === id);
    if (wp) {
        wp.lat = lat;
        wp.lon = lon;
        const index = waypoints.indexOf(wp);
        const label = wp.isStart ? `<strong>🏪 起點</strong><br>外送餐廳 / 倉庫` : `<strong>📦 配送點 ${index}</strong><br>台灣機車外送目標點`;
        wp.marker.setPopupContent(label);
        renderWaypointsList();
        clearRoutes();
    }
}

/** 重新整理所有標記的圖示與 Popup 內容（刪除或新增後校正編號） */
function updateMarkersUI() {
    waypoints.forEach((wp, index) => {
        wp.marker.setIcon(createCustomIcon(index, wp.isStart));
        const label = wp.isStart ? `<strong>🏪 起點</strong><br>外送餐廳 / 倉庫` : `<strong>📦 配送點 ${index}</strong><br>台灣機車外送目標點`;
        wp.marker.setPopupContent(label);
    });
}

/**
 * 刪除指定站點（由 DOM 按鈕 onclick 觸發）
 * 設為 window 屬性以便內聯 onclick 存取
 */
window.deleteWaypoint = function(id) {
    const index = waypoints.findIndex(w => w.id === id);
    if (index !== -1) {
        map.removeLayer(waypoints[index].marker);
        waypoints.splice(index, 1);

        renderWaypointsList();
        updateMarkersUI();
        clearRoutes();
    }
};

/** 清除地圖上所有站點與路線 */
function clearAll() {
    waypoints.forEach(wp => map.removeLayer(wp.marker));
    waypoints = [];
    clearRoutes();
    renderWaypointsList();
}

/** 載入預設的 4 個範例站點，並自動縮放地圖至涵蓋範圍 */
function loadDefaultWaypoints() {
    clearAll();
    DEFAULT_POINTS.forEach((coords, index) => {
        // DEFAULT_POINTS 為 [lon, lat]，Leaflet 使用 [lat, lon]
        addWaypoint(coords[1], coords[0], index === 0);
    });

    if (waypoints.length > 0) {
        const group = new L.featureGroup(waypoints.map(w => w.marker));
        map.fitBounds(group.getBounds().pad(0.1));
    }
}
