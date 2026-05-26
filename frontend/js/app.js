/* ═══════════════════════════════════════════
   事件綁定與應用程式啟動入口
   ═══════════════════════════════════════════ */

// 初始化 Lucide 圖示（需在 DOM 就緒後執行）
lucide.createIcons();

// ─── 按鈕事件 ───
document.getElementById('btn-calculate').addEventListener('click', calculateBestTrip);
document.getElementById('btn-clear').addEventListener('click', clearAll);
document.getElementById('btn-reset').addEventListener('click', loadDefaultWaypoints);

// ─── 地圖主題切換 ───
document.getElementById('select-theme').addEventListener('change', function(e) {
    const selectedTheme = e.target.value;
    if (tileLayers[selectedTheme]) {
        map.removeLayer(currentTileLayer);
        currentTileLayer = tileLayers[selectedTheme];
        currentTileLayer.addTo(map);

        const prevDark = isDarkTheme;
        isDarkTheme = (selectedTheme === 'dark');

        // 只有在主題深淺真的改變時，才更新預設路線顏色
        if (prevDark !== isDarkTheme) {
            const colorInput = document.getElementById('input-route-color');
            const colorLabel = document.getElementById('label-route-color');

            // 若使用者未曾手動調色，自動切換最適合的對比色
            if (!isColorCustomized) {
                if (isDarkTheme) {
                    userRouteColor = '#38bdf8';
                } else {
                    userRouteColor = '#1d4ed8';
                }
                colorInput.value = userRouteColor;
                colorLabel.innerText = userRouteColor.toUpperCase();
            }
            updateRouteStyle();
        }
    }
});

// ─── 路線色彩選取器 ───
document.getElementById('input-route-color').addEventListener('input', function(e) {
    isColorCustomized = true; // 標記已手動更改，避免主題切換時被覆蓋
    userRouteColor = e.target.value;
    document.getElementById('label-route-color').innerText = userRouteColor.toUpperCase();
    updateRouteStyle();
});

// ─── 地圖點擊新增站點 ───
// 第一個點自動設為起點
map.on('click', function (event) {
    const lat = event.latlng.lat;
    const lon = event.latlng.lng;

    const isStart = waypoints.length === 0;
    addWaypoint(lat, lon, isStart);
});

// ─── 啟動：載入預設站點 ───
loadDefaultWaypoints();
