/* ═══════════════════════════════════════════
   測試 maneuvers.js 純函式與步驟解析邏輯
   執行方式: node tests/test_parseSteps.js
   ═══════════════════════════════════════════ */

const assert = require('node:assert');

// ───── 載入受測模組 ─────
const {
    MANEUVER_CONFIG,
    getManeuverIcon,
    getManeuverLabel,
    isMergeable,
    isBreakPoint,
    displayName,
    buildNameChain,
    parseSteps
} = require('../frontend/js/maneuvers.js');

// ───── 輔助：產生模擬 RouteStep ─────
function mockStep(type, modifier, name, distance = 100, options = {}) {
    return {
        maneuver: { type, modifier, ...(options.exit !== undefined ? { exit: options.exit } : {}) },
        name,
        distance,
        duration: distance * 0.5,
        ...options
    };
}

function mockLeg(steps) {
    return { steps, distance: steps.reduce((s, x) => s + x.distance, 0), duration: steps.reduce((s, x) => s + x.duration, 0) };
}

// ══════════════════════════════════════════
// 1. MANEUVER_CONFIG 完整性
// ══════════════════════════════════════════
(function test_config_completeness() {
    const expectedTypes = [
        'turn', 'new name', 'continue', 'depart', 'arrive',
        'end of road', 'fork', 'merge', 'on ramp', 'off ramp',
        'roundabout', 'roundabout turn', 'exit roundabout',
        'rotary', 'exit rotary', 'notification'
    ];
    for (const t of expectedTypes) {
        assert.ok(MANEUVER_CONFIG[t], `缺少 maneuver type: ${t}`);
        assert.ok(MANEUVER_CONFIG[t].icon, `${t}: 缺少 icon`);
        assert.ok(MANEUVER_CONFIG[t].label, `${t}: 缺少 label`);
        assert.ok(MANEUVER_CONFIG[t].mergeable !== undefined, `${t}: 缺少 mergeable`);
    }
    console.log('✓ config_completeness: 16 種 maneuver type 皆完整');
})();

// ══════════════════════════════════════════
// 2. getManeuverIcon
// ══════════════════════════════════════════
(function test_getManeuverIcon() {
    assert.strictEqual(getManeuverIcon('turn', 'left'), '↰');
    assert.strictEqual(getManeuverIcon('turn', 'right'), '↳');
    assert.strictEqual(getManeuverIcon('turn', 'sharp left'), '↰');
    assert.strictEqual(getManeuverIcon('turn', 'sharp right'), '↳');
    assert.strictEqual(getManeuverIcon('turn', 'straight'), '↑');
    assert.strictEqual(getManeuverIcon('depart', 'right'), '➤');
    assert.strictEqual(getManeuverIcon('arrive', 'right'), '●');
    assert.strictEqual(getManeuverIcon('continue', 'uturn'), '↩');
    assert.strictEqual(getManeuverIcon('new name', 'straight'), '↑');
    // 未知 type 回退箭頭
    assert.strictEqual(getManeuverIcon('unknown_type', 'x'), '→');
    console.log('✓ getManeuverIcon: 各 type/modifier 圖示正確');
})();

// ══════════════════════════════════════════
// 3. getManeuverLabel
// ══════════════════════════════════════════
(function test_getManeuverLabel() {
    assert.strictEqual(getManeuverLabel('turn', 'left'), '左轉');
    assert.strictEqual(getManeuverLabel('turn', 'right'), '右轉');
    assert.strictEqual(getManeuverLabel('turn', 'slight left'), '微左轉');
    assert.strictEqual(getManeuverLabel('turn', 'slight right'), '微右轉');
    assert.strictEqual(getManeuverLabel('turn', 'straight'), '直行');
    assert.strictEqual(getManeuverLabel('depart', 'right'), '出發');
    assert.strictEqual(getManeuverLabel('arrive', 'right'), '抵達');
    assert.strictEqual(getManeuverLabel('continue', 'uturn'), '迴轉');
    assert.strictEqual(getManeuverLabel('new name', 'straight'), '續行');
    assert.strictEqual(getManeuverLabel('roundabout', 'left'), '圓環');
    assert.strictEqual(getManeuverLabel('fork', 'left'), '岔路');
    assert.strictEqual(getManeuverLabel('notification', 'straight'), '注意');
    console.log('✓ getManeuverLabel: 各 type/modifier 標籤正確');
})();

// ══════════════════════════════════════════
// 4. isMergeable
// ══════════════════════════════════════════
(function test_isMergeable() {
    // 可合併
    assert.strictEqual(isMergeable('new name', 'straight'), true);
    assert.strictEqual(isMergeable('continue', 'straight'), true);

    // 不可合併
    assert.strictEqual(isMergeable('turn', 'left'), false);
    assert.strictEqual(isMergeable('turn', 'right'), false);
    assert.strictEqual(isMergeable('depart', 'right'), false);
    assert.strictEqual(isMergeable('arrive', 'right'), false);
    assert.strictEqual(isMergeable('continue', 'uturn'), false);
    assert.strictEqual(isMergeable('new name', 'left'), false);
    assert.strictEqual(isMergeable('new name', 'right'), false);
    assert.strictEqual(isMergeable('fork', 'left'), false);
    assert.strictEqual(isMergeable('roundabout', 'left'), false);
    assert.strictEqual(isMergeable('end of road', 'left'), false);
    assert.strictEqual(isMergeable('merge', 'straight'), false);

    // 未知 type
    assert.strictEqual(isMergeable('bogus', 'x'), false);
    console.log('✓ isMergeable: 合併規則正確');
})();

// ══════════════════════════════════════════
// 4b. isBreakPoint
// ══════════════════════════════════════════
(function test_isBreakPoint() {
    // 應為斷點
    assert.strictEqual(isBreakPoint('turn'), true);
    assert.strictEqual(isBreakPoint('arrive'), true);
    assert.strictEqual(isBreakPoint('fork'), true);
    assert.strictEqual(isBreakPoint('roundabout'), true);
    assert.strictEqual(isBreakPoint('end of road'), true);
    assert.strictEqual(isBreakPoint('merge'), true);

    // 不應為斷點（可接受合併）
    assert.strictEqual(isBreakPoint('depart'), false);
    assert.strictEqual(isBreakPoint('new name'), false);
    assert.strictEqual(isBreakPoint('continue'), false);

    // 未知 type 預設為非斷點（保守處理，不斷開）
    assert.strictEqual(isBreakPoint('unknown'), false);
    console.log('✓ isBreakPoint: 斷點分類正確');
})();

// ══════════════════════════════════════════
// 5. displayName
// ══════════════════════════════════════════
(function test_displayName() {
    assert.strictEqual(displayName('忠孝東路'), '忠孝東路');
    assert.strictEqual(displayName(''), '無名道路');
    assert.strictEqual(displayName(null), '無名道路');
    assert.strictEqual(displayName(undefined), '無名道路');
    console.log('✓ displayName: 空值回退「無名道路」正確');
})();

// ══════════════════════════════════════════
// 6. buildNameChain
// ══════════════════════════════════════════
(function test_buildNameChain() {
    // 單一名稱
    assert.strictEqual(buildNameChain(['忠孝東路']), '忠孝東路');

    // 共同前綴（同路不同段）
    assert.strictEqual(
        buildNameChain(['忠孝東路一段', '忠孝東路二段', '忠孝東路三段']),
        '忠孝東路(一段→二段→三段)'
    );

    // 名稱完全相同
    assert.strictEqual(
        buildNameChain(['復興南路', '復興南路']),
        '復興南路'
    );

    // 無共同前綴
    assert.strictEqual(
        buildNameChain(['市民大道', '忠孝東路']),
        '市民大道→忠孝東路'
    );

    // 包含空值 → 轉為「無名道路」
    assert.strictEqual(
        buildNameChain(['忠孝東路', '']),
        '忠孝東路→無名道路'
    );

    // 空陣列
    assert.strictEqual(buildNameChain([]), '');

    console.log('✓ buildNameChain: 名稱串接邏輯正確');
})();

// ══════════════════════════════════════════
// 7. parseSteps — 合併規則整合測試
// ══════════════════════════════════════════
(function test_parseSteps_merge() {
    // 情境：一個 leg 包含 new name/straight 合併 + 轉彎斷點
    const legs = [mockLeg([
        mockStep('depart', 'right', '忠孝西路一段', 200),
        mockStep('turn', 'left', '重慶北路一段', 120),
        mockStep('new name', 'straight', '忠孝東路一段', 750),
        mockStep('new name', 'straight', '忠孝東路二段', 630),
        mockStep('turn', 'right', '復興南路一段', 190),
        mockStep('arrive', 'right', '復興南路一段', 0),
    ])];

    const result = parseSteps(legs);

    // depart 應獨立
    assert.strictEqual(result[0].type, 'depart');
    assert.strictEqual(result[0].distance, 200);

    // turn/left 轉彎應獨立
    assert.strictEqual(result[1].type, 'turn');
    assert.strictEqual(result[1].modifier, 'left');
    assert.strictEqual(result[1].distance, 120);

    // 兩個 new name/straight 應合併為一個 group
    assert.strictEqual(result[2].type, 'new name');
    assert.strictEqual(result[2].distance, 1380); // 750 + 630
    assert.strictEqual(result[2].nameChain.length, 2);
    assert.ok(result[2].nameDisplay.includes('忠孝東路'));

    // turn/right 應獨立
    assert.strictEqual(result[3].type, 'turn');
    assert.strictEqual(result[3].modifier, 'right');
    assert.strictEqual(result[3].distance, 190);

    // arrive 應獨立
    assert.strictEqual(result[4].type, 'arrive');
    assert.strictEqual(result[4].distance, 0);

    assert.strictEqual(result.length, 5);
    console.log('✓ parseSteps_merge: new name/straight 合併正確，轉彎皆獨立');
})();

// ══════════════════════════════════════════
// 8. parseSteps — continue/straight 合併
// ══════════════════════════════════════════
(function test_parseSteps_continue_straight() {
    const legs = [mockLeg([
        mockStep('depart', 'right', '中山路', 300),
        mockStep('continue', 'straight', '中山路', 500),
        mockStep('turn', 'left', '民權路', 200),
    ])];

    const result = parseSteps(legs);

    // depart 獨立
    assert.strictEqual(result[0].type, 'depart');
    // continue/straight 與前一步同名 → 合併到 depart，但因為 continue/straight 是 mergeable，
    // 且與前一步 (depart) 不同 type，但 mergeable 檢查只看 type/modifier
    // 實際上 continue/straight 會與 depart 合併
    // 結果應該只有 2 個 group: (depart+continue) → turn
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].distance, 800); // 300 + 500
    assert.strictEqual(result[1].type, 'turn');
    console.log('✓ parseSteps_continue_straight: continue/straight 正確合併');
})();

// ══════════════════════════════════════════
// 9. parseSteps — 邊界：空的 legs
// ══════════════════════════════════════════
(function test_parseSteps_empty() {
    assert.deepStrictEqual(parseSteps([]), []);
    assert.deepStrictEqual(parseSteps([mockLeg([])]), []);
    console.log('✓ parseSteps_empty: 空 legs 回傳空陣列');
})();

// ══════════════════════════════════════════
// 10. parseSteps — 多個 leg（跨 leg 不應合併）
// ══════════════════════════════════════════
(function test_parseSteps_multiple_legs() {
    const legs = [
        mockLeg([mockStep('depart', 'right', '忠孝東路', 500), mockStep('arrive', 'right', '敦化南路', 0)]),
        mockLeg([mockStep('depart', 'right', '敦化南路', 300), mockStep('arrive', 'right', '終點', 0)]),
    ];
    const result = parseSteps(legs);

    assert.strictEqual(result.length, 4); // depart, arrive, depart, arrive
    assert.strictEqual(result[0].type, 'depart');
    assert.strictEqual(result[1].type, 'arrive');
    assert.strictEqual(result[2].type, 'depart');
    assert.strictEqual(result[3].type, 'arrive');
    // Leg 邊界：第二個 depart 不應與前一個 arrive 合併
    assert.strictEqual(result[2].nameChain[0], '敦化南路');
    console.log('✓ parseSteps_multiple_legs: 跨 leg 邊界正確，不互相合併');
})();

// ══════════════════════════════════════════
// 11. parseSteps — sortedWaypoints 標籤
// ══════════════════════════════════════════
(function test_parseSteps_waypoint_labels() {
    const legs = [
        mockLeg([mockStep('depart', 'right', '路A', 100), mockStep('arrive', 'right', '路B', 0)]),
        mockLeg([mockStep('depart', 'right', '路B', 100), mockStep('arrive', 'left', '路C', 0)]),
    ];
    const waypoints = [{ trips_index: 0 }, { trips_index: 0 }, { trips_index: 1 }];
    const result = parseSteps(legs, waypoints);

    assert.strictEqual(result.length, 4);

    // 第一個 arrive → 站點 1
    const arrive1 = result.find(s => s.type === 'arrive' && s.nameChain[0] === '路B');
    assert.ok(arrive1);
    assert.strictEqual(arrive1.waypointLabel, '站點 1');

    // 第二個 arrive → 終點
    const arrive2 = result.find(s => s.type === 'arrive' && s.nameChain[0] === '路C');
    assert.ok(arrive2);
    assert.strictEqual(arrive2.waypointLabel, '終點');

    console.log('✓ parseSteps_waypoint_labels: arrive 站點標籤正確');
})();

// ══════════════════════════════════════════
// 12. parseSteps — 同名道路合併後不重複加入 nameChain
// ══════════════════════════════════════════
(function test_parseSteps_dedup_name() {
    const legs = [mockLeg([
        mockStep('new name', 'straight', '中山路', 100),
        mockStep('new name', 'straight', '中山路', 200), // 同名，不應重複加入 nameChain
    ])];
    const result = parseSteps(legs);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].nameChain.length, 1);
    assert.strictEqual(result[0].distance, 300);
    console.log('✓ parseSteps_dedup_name: 同名合併不重複加入 nameChain');
})();

// ══════════════════════════════════════════
// 13. 雙模式導出檢查
// ══════════════════════════════════════════
(function test_exports() {
    assert.ok(typeof MANEUVER_CONFIG === 'object');
    assert.ok(typeof getManeuverIcon === 'function');
    assert.ok(typeof getManeuverLabel === 'function');
    assert.ok(typeof isMergeable === 'function');
    assert.ok(typeof displayName === 'function');
    assert.ok(typeof buildNameChain === 'function');
    assert.ok(typeof parseSteps === 'function');
    console.log('✓ exports: 所有函式正確導出');
})();

// ══════════════════════════════════════════
console.log('\n🎉 所有測試通過！');
