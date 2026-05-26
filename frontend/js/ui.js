/* ═══════════════════════════════════════════
   UI 渲染輔助：預設點位、站點列表繪製
   ═══════════════════════════════════════════ */

// 預設 4 個範例站點 [lon, lat]（OSRM 慣用格式）
const DEFAULT_POINTS = [
    [121.517, 25.047], // 台北車站 (起點)
    [121.544, 25.042], // 忠孝復興
    [121.564, 25.033], // 台北 101
    [121.519, 25.026]  // 古亭
];

/**
 * 渲染右側面板的站點列表
 * 從 waypoints 全域陣列讀取資料，生成 DOM
 */
function renderWaypointsList() {
    const container = document.getElementById('waypoints-list');
    if (waypoints.length === 0) {
        container.innerHTML = '<div class="empty-text">請在地圖上點擊來新增站點</div>';
        return;
    }

    container.innerHTML = '';
    waypoints.forEach((wp, index) => {
        const item = document.createElement('div');
        item.className = 'waypoint-item';

        const badgeClass = wp.isStart ? 'start' : 'dest';
        const label = wp.isStart ? '🏪 起點' : `📦 站點 ${index}`;

        item.innerHTML = `
            <div class="waypoint-info">
                <div class="waypoint-badge ${badgeClass}">${wp.isStart ? '🏪' : index}</div>
                <div>
                    <div style="font-weight: 500;">${label}</div>
                    <div class="waypoint-coords">${wp.lat.toFixed(5)}, ${wp.lon.toFixed(5)}</div>
                </div>
            </div>
            ${wp.isStart ? '' : `<button class="btn-delete" onclick="deleteWaypoint('${wp.id}')" title="刪除站點" aria-label="刪除站點"><i data-lucide="x"></i></button>`}
        `;
        container.appendChild(item);
    });
    // 重新渲染 Lucide 圖示（新插入的 DOM 需要初始化）
    lucide.createIcons();
}
