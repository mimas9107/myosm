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

/**
 * 格式化距離：< 1000m 顯示「Xm」，≥ 1000m 顯示「X.Xkm」
 */
function formatDistance(meters) {
    if (meters >= 1000) return (meters / 1000).toFixed(1) + 'km';
    return Math.round(meters) + 'm';
}

/** 顯示右側步驟 Dock 面板 */
function showStepsDock() {
    const dock = document.getElementById('steps-dock');
    dock.classList.remove('collapsed');
}

/** 隱藏右側步驟 Dock 面板並清除內容 */
function hideStepsDock() {
    const dock = document.getElementById('steps-dock');
    dock.classList.add('collapsed');
    const container = document.getElementById('step-list');
    const emptyEl = document.getElementById('steps-empty');
    const countEl = document.getElementById('steps-count');
    if (container) container.innerHTML = '';
    if (countEl) countEl.textContent = '0 步';
    if (emptyEl) emptyEl.style.display = 'flex';
}

/** 切換右側步驟 Dock 面板收合狀態 */
function toggleStepsDock() {
    const dock = document.getElementById('steps-dock');
    dock.classList.toggle('collapsed');
}

/** 切換左側控制面板收合狀態 */
function toggleControlPanel() {
    const panel = document.getElementById('control-panel');
    panel.classList.toggle('collapsed');
}

/**
 * 渲染 step-by-step 路段動作卡片清單至右側 Dock
 * @param {Array} steps - 由 parseSteps() 回傳的處理後步驟陣列
 */
function renderStepList(steps) {
    const container = document.getElementById('step-list');
    const emptyEl = document.getElementById('steps-empty');
    const countEl = document.getElementById('steps-count');

    if (!steps || steps.length === 0) {
        container.innerHTML = '';
        countEl.textContent = '0 步';
        emptyEl.style.display = 'flex';
        return;
    }

    emptyEl.style.display = 'none';
    container.innerHTML = '';

    steps.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'step-card';
        if (s.type === 'arrive') card.classList.add('step-card-arrive');
        if (s.type === 'depart') card.classList.add('step-card-depart');

        // 動作列
        const actionRow = document.createElement('div');
        actionRow.className = 'step-action-row';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'step-icon';
        iconSpan.textContent = s.icon;
        actionRow.appendChild(iconSpan);

        const actionSpan = document.createElement('span');
        actionSpan.className = 'step-action';
        let actionText = s.action;

        if (s.type === 'roundabout' || s.type === 'rotary') {
            actionText += s.exit ? ` 第${s.exit}出口` : '';
        }
        if (s.type === 'fork') {
            actionText += s.modifier === 'left' ? ' 靠左' : ' 靠右';
        }
        if (s.type === 'end of road') {
            actionText += s.modifier === 'left' ? ' 左轉' : ' 右轉';
        }
        actionSpan.textContent = actionText;
        actionRow.appendChild(actionSpan);

        // 若為抵達，額外顯示站點索引
        if (s.type === 'arrive') {
            const waypointIdx = document.createElement('span');
            waypointIdx.className = 'step-waypoint';
            waypointIdx.textContent = s.waypointLabel || '';
            actionRow.appendChild(waypointIdx);
        }

        card.appendChild(actionRow);

        // 道路名稱列
        const nameDiv = document.createElement('div');
        nameDiv.className = 'step-name';
        nameDiv.textContent = s.nameDisplay;
        card.appendChild(nameDiv);

        // 若合併多段，顯示合併明細
        if (s.nameChain && s.nameChain.length > 1) {
            const detailDiv = document.createElement('div');
            detailDiv.className = 'step-name-chain';
            detailDiv.textContent = '合併: ' + s.nameChain.map(n => displayName(n)).join(' → ');
            card.appendChild(detailDiv);
        }

        // 距離（抵達不顯示距離）
        if (s.type !== 'arrive') {
            const distSpan = document.createElement('span');
            distSpan.className = 'step-distance';
            distSpan.textContent = formatDistance(s.distance);
            card.appendChild(distSpan);
        }

        container.appendChild(card);
    });

    lucide.createIcons();
    countEl.textContent = steps.length + ' 步';
    showStepsDock();
}
