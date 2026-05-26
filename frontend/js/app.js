lucide.createIcons();

document.getElementById('btn-calculate').addEventListener('click', calculateBestTrip);
document.getElementById('btn-clear').addEventListener('click', clearAll);
document.getElementById('btn-reset').addEventListener('click', loadDefaultWaypoints);
document.getElementById('select-theme').addEventListener('change', function(e) {
    const selectedTheme = e.target.value;
    if (tileLayers[selectedTheme]) {
        map.removeLayer(currentTileLayer);
        currentTileLayer = tileLayers[selectedTheme];
        currentTileLayer.addTo(map);

        const prevDark = isDarkTheme;
        isDarkTheme = (selectedTheme === 'dark');

        if (prevDark !== isDarkTheme) {
            const colorInput = document.getElementById('input-route-color');
            const colorLabel = document.getElementById('label-route-color');

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

document.getElementById('input-route-color').addEventListener('input', function(e) {
    isColorCustomized = true;
    userRouteColor = e.target.value;
    document.getElementById('label-route-color').innerText = userRouteColor.toUpperCase();
    updateRouteStyle();
});

map.on('click', function (event) {
    const lat = event.latlng.lat;
    const lon = event.latlng.lng;

    const isStart = waypoints.length === 0;
    addWaypoint(lat, lon, isStart);
});

loadDefaultWaypoints();
