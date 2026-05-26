const map = L.map('map', {
    zoomControl: false
}).setView([25.047, 121.517], 14);

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

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

let currentTileLayer = tileLayers.osm;
currentTileLayer.addTo(map);

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
