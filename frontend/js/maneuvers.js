/* ═══════════════════════════════════════════
   OSRM Maneuver Type 完整對應表
   涵蓋 16 種 maneuver type + 8 種 modifier
   ═══════════════════════════════════════════ */

/**
 * 各 maneuver type/modifier 的顯示設定與合併規則。
 * mergeable 為 true / 物件時表示該 (type, modifier) 可被前一步合併。
 */
const MANEUVER_CONFIG = {
    turn: {
        icon:  { left:'↰', 'sharp left':'↰', 'slight left':'↰', right:'↳', 'sharp right':'↳', 'slight right':'↳', straight:'↑' },
        label: { left:'左轉', 'sharp left':'左後轉', 'slight left':'微左轉', right:'右轉', 'sharp right':'右後轉', 'slight right':'微右轉', straight:'直行' },
        mergeable: false
    },
    'new name': {
        icon:  { straight:'↑', left:'↰', right:'↳' },
        label: { straight:'續行', left:'轉入', right:'轉入' },
        mergeable: { straight: true }
    },
    continue: {
        icon:  { uturn:'↩', straight:'↑', left:'↰', right:'↳', 'slight left':'↰', 'slight right':'↳' },
        label: { uturn:'迴轉', straight:'直行', left:'左轉', right:'右轉', 'slight left':'微左轉', 'slight right':'微右轉' },
        mergeable: { straight: true }
    },
    depart: {
        icon:  { _default:'➤' },
        label: { _default:'出發' },
        mergeable: false
    },
    arrive: {
        icon:  { _default:'●' },
        label: { _default:'抵達' },
        mergeable: false
    },
    'end of road': {
        icon:  { _default:'⊥' },
        label: { _default:'路底' },
        mergeable: false
    },
    fork: {
        icon:  { _default:'Y' },
        label: { _default:'岔路' },
        mergeable: false
    },
    merge: {
        icon:  { _default:'═' },
        label: { _default:'匯入' },
        mergeable: false
    },
    'on ramp': {
        icon:  { _default:'╰' },
        label: { _default:'上匝道' },
        mergeable: false
    },
    'off ramp': {
        icon:  { _default:'╭' },
        label: { _default:'下匝道' },
        mergeable: false
    },
    roundabout: {
        icon:  { _default:'◯' },
        label: { _default:'圓環' },
        mergeable: false
    },
    'roundabout turn': {
        icon:  { _default:'◯' },
        label: { _default:'圓環' },
        mergeable: false
    },
    'exit roundabout': {
        icon:  { _default:'◯' },
        label: { _default:'離開圓環' },
        mergeable: false
    },
    rotary: {
        icon:  { _default:'◎' },
        label: { _default:'轉盤' },
        mergeable: false
    },
    'exit rotary': {
        icon:  { _default:'◎' },
        label: { _default:'離開轉盤' },
        mergeable: false
    },
    notification: {
        icon:  { _default:'ℹ' },
        label: { _default:'注意' },
        mergeable: false
    }
};

/** 查找設定值，若 modifier 無對應則回退 _default 或空字串 */
function lookup(configEntry, modifier) {
    const map = configEntry;
    if (map[modifier] !== undefined) return map[modifier];
    if (map._default !== undefined) return map._default;
    return '';
}

/** 取得該步驟的顯示圖示 */
function getManeuverIcon(type, modifier) {
    const entry = MANEUVER_CONFIG[type];
    if (!entry) return '→';
    return lookup(entry.icon, modifier);
}

/** 取得該步驟的顯示動作文字 */
function getManeuverLabel(type, modifier) {
    const entry = MANEUVER_CONFIG[type];
    if (!entry) return '';
    return lookup(entry.label, modifier);
}

/** 此 (type, modifier) 是否可被前一步合併 */
function isMergeable(type, modifier) {
    const entry = MANEUVER_CONFIG[type];
    if (!entry) return false;
    if (typeof entry.mergeable === 'boolean') return entry.mergeable;
    if (typeof entry.mergeable === 'object') return !!entry.mergeable[modifier];
    return false;
}

/** 此 (type) 是否為轉彎/岔路/結束等「動作斷點」（不可接受後續合併） */
function isBreakPoint(type) {
    const breakTypes = ['turn', 'arrive', 'end of road', 'fork', 'merge',
        'on ramp', 'off ramp', 'roundabout', 'roundabout turn',
        'exit roundabout', 'rotary', 'exit rotary', 'notification'];
    return breakTypes.includes(type);
}

/** 道路名稱顯示：若為空字串則顯示「無名道路」 */
function displayName(name) {
    return name || '無名道路';
}

/**
 * 將多個 name 串接為合併顯示字串
 * 範例: ['忠孝東路一段','忠孝東路二段','忠孝東路三段']
 *   → '忠孝東路 (一段→二段→三段)'
 */
function buildNameChain(names) {
    if (!names || names.length === 0) return '';
    if (names.length === 1) return displayName(names[0]);

    // 嘗試提取共同前綴（如「忠孝東路」）
    const segments = names.map(n => displayName(n));
    // 若所有名稱字串相同，直接取第一個
    if (segments.every(s => s === segments[0])) return segments[0];

    // 取最長共同前綴：比對第一個與最後一個的共同開頭
    const first = segments[0];
    const last = segments[segments.length - 1];
    let commonLen = 0;
    while (commonLen < first.length && commonLen < last.length && first[commonLen] === last[commonLen]) {
        commonLen++;
    }

    if (commonLen > 0 && commonLen < first.length) {
        const prefix = first.slice(0, commonLen);
        const suffix = segments.map(s => s.slice(commonLen));
        return `${prefix}(${suffix.join('→')})`;
    }

    // 無共同前綴，直接串接
    return segments.join('→');
}

/**
 * 將 OSRM Trip API 回傳的 legs 解析為前端顯示用的步驟陣列。
 * 合併規則：
 *   - new name/straight 與 continue/straight 可被前一步合併
 *   - 其餘皆為斷點（turn、arrive、fork、roundabout 等）
 *
 * @param {Array} legs            - trips[0].legs
 * @param {Array} [sortedWaypoints] - 排序後的 waypoints（為 arrive 步驟加上站點標籤）
 * @returns {Array<Object>} 顯示用步驟物件
 */
function parseSteps(legs, sortedWaypoints) {
    const result = [];
    let group = null;
    let legIndex = 0;

    for (const leg of legs) {
        for (const step of leg.steps) {
            const type = step.maneuver.type;
            const modifier = step.maneuver.modifier;
            const name = displayName(step.name);

            // 合併條件：此 step 可合併 + 當前群組也接受合併（始於可合併型別）
            if (isMergeable(type, modifier) && group && group._acceptMerge) {
                group.distance += step.distance;
                group.duration += step.duration;
                if (name !== group.nameChain[group.nameChain.length - 1]) {
                    group.nameChain.push(name);
                }
                continue;
            }

            // 斷點：關閉舊群組、開啟新群組
            if (group) result.push(group);

            group = {
                icon: getManeuverIcon(type, modifier),
                action: getManeuverLabel(type, modifier),
                nameChain: [name],
                distance: step.distance,
                duration: step.duration,
                type,
                modifier,
                exit: step.maneuver.exit,
                _acceptMerge: !isBreakPoint(type)   // 非斷點型別可持續接收合併
            };

            // arrive 步驟附加對應站點標籤
            if (type === 'arrive' && sortedWaypoints) {
                const wpIdx = legIndex + 1;
                const isLast = wpIdx >= sortedWaypoints.length - 1;
                group.waypointLabel = isLast ? '終點' : `站點 ${wpIdx}`;
            }
        }
        legIndex++;
    }
    if (group) result.push(group);

    // 計算每個 group 的顯示用 nameDisplay（洗掉內部 _acceptMerge）
    for (const g of result) {
        g.nameDisplay = buildNameChain(g.nameChain);
        delete g._acceptMerge;
    }

    return result;
}

// 雙模式匯出：瀏覽器用全域變數、Node.js 用 module.exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MANEUVER_CONFIG, getManeuverIcon, getManeuverLabel, isMergeable, isBreakPoint, displayName, buildNameChain, parseSteps };
}
