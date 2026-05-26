let waypoints = [];

function addWaypoint(lat, lon, isStart = false) {
    const id = Math.random().toString(36).substr(2, 9);
    const index = waypoints.length;

    const marker = L.marker([lat, lon], {
        icon: createCustomIcon(index, isStart),
        draggable: true
    }).addTo(map);

    const label = isStart ? `<strong>🏪 起點</strong><br>外送餐廳 / 倉庫` : `<strong>📦 配送點 ${index}</strong><br>台灣機車外送目標點`;
    marker.bindPopup(label);

    marker.on('dragend', function (event) {
        const position = marker.getLatLng();
        updateWaypointPosition(id, position.lat, position.lng);
    });

    waypoints.push({
        id,
        lat,
        lon,
        marker,
        isStart
    });

    renderWaypointsList();
    clearRoutes();
    updateMarkersUI();
}

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

function updateMarkersUI() {
    waypoints.forEach((wp, index) => {
        wp.marker.setIcon(createCustomIcon(index, wp.isStart));
        const label = wp.isStart ? `<strong>🏪 起點</strong><br>外送餐廳 / 倉庫` : `<strong>📦 配送點 ${index}</strong><br>台灣機車外送目標點`;
        wp.marker.setPopupContent(label);
    });
}

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

function clearAll() {
    waypoints.forEach(wp => map.removeLayer(wp.marker));
    waypoints = [];
    clearRoutes();
    renderWaypointsList();
}

function loadDefaultWaypoints() {
    clearAll();
    DEFAULT_POINTS.forEach((coords, index) => {
        addWaypoint(coords[1], coords[0], index === 0);
    });

    if (waypoints.length > 0) {
        const group = new L.featureGroup(waypoints.map(w => w.marker));
        map.fitBounds(group.getBounds().pad(0.1));
    }
}
