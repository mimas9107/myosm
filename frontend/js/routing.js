let routeLayers = [];
let userRouteColor = '#1d4ed8';
let isDarkTheme = false;
let isColorCustomized = false;

function clearRoutes() {
    routeLayers.forEach(layer => map.removeLayer(layer));
    routeLayers = [];
    document.getElementById('result-section').style.display = 'none';
}

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

async function calculateBestTrip() {
    if (waypoints.length < 2) {
        alert('請至少加入 1 個起點與 1 個配送點！');
        return;
    }

    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
    loader.setAttribute('aria-hidden', 'false');

    const coordsString = waypoints.map(wp => `${wp.lon},${wp.lat}`).join(';');

    const isRoundTrip = document.getElementById('toggle-roundtrip').checked;

    const osrmUrl = `http://localhost:5000/trip/v1/motorcycle/${coordsString}?source=first&destination=any&roundtrip=${isRoundTrip}&geometries=geojson&overview=full`;

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

        const trip = data.trips[0];
        const distanceKm = (trip.distance / 1000).toFixed(2);
        const durationMin = Math.round(trip.duration / 60);

        document.getElementById('val-distance').innerHTML = `${distanceKm}<span>公里</span>`;
        document.getElementById('val-duration').innerHTML = `${durationMin}<span>分鐘</span>`;

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

        document.getElementById('result-section').style.display = 'flex';

        const glowLayer = L.geoJSON(trip.geometry).addTo(map);
        const coreLayer = L.geoJSON(trip.geometry).addTo(map);

        routeLayers.push(glowLayer, coreLayer);
        updateRouteStyle();

        const bounds = glowLayer.getBounds();
        map.fitBounds(bounds.pad(0.15));

    } catch (error) {
        console.error(error);
        alert('無法連線到 OSRM 伺服器，請確保 http://localhost:5000 正在運作中。');
    } finally {
        loader.style.display = 'none';
        loader.setAttribute('aria-hidden', 'true');
    }
}
