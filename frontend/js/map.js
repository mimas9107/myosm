/* ═══════════════════════════════════════════
   地圖初始化、圖層定義、自訂 Marker 工廠
   ═══════════════════════════════════════════ */

// 以台北車站為中心初始化 Leaflet 地圖，隱藏預設縮放鈕
const map = L.map('map', {
    zoomControl: false
}).setView([25.047, 121.517], 14);

// 自訂縮放控制置於右下角
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// 三種地圖主題的圖磚來源
const tileLayers = {
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }),
    voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    })
};

// 預設載入標準 OSM 亮色地圖
let currentTileLayer = tileLayers.osm;
currentTileLayer.addTo(map);

/**
 * 產生自訂的 Leaflet DivIcon（水滴造型標記）
 * @param {number} index  - 站點順序編號
 * @param {boolean} isStart - 是否為起點
 * @returns {L.DivIcon}
 */
function createCustomIcon(index, isStart) {
    const label = isStart ? '🏪' : index;
    const className = isStart ? 'marker-pin start' : 'marker-pin dest';
    return L.divIcon({
        className: 'custom-marker-icon',
        html: `<div class="${className}"><span>${label}</span></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });
}
