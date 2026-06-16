const W3W_API_KEY = 'IWL04U57';
const WIND_API_KEY = '24b4bee5cfc7eb51d2141edba1c273ba';
const WIND_SPEED_OFFSET = 34.1;
const DEFAULT_TIME_MINUTES = 15;

let map;
let polyPoints = [];

async function convertCoordinatesTo3Words(lat, lon) {
  const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lon}&key=${W3W_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`what3words request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.words || 'Not available';
}

async function getWindData(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WIND_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.wind;
}

function calculateDestinationPoint(lat, lon, distanceKm, bearingDegrees) {
  const earthRadiusKm = 6371;
  const bearing = bearingDegrees * (Math.PI / 180);
  const distance = distanceKm / earthRadiusKm;
  const lat1 = lat * (Math.PI / 180);
  const lon1 = lon * (Math.PI / 180);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance) +
    Math.cos(lat1) * Math.sin(distance) * Math.cos(bearing)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(distance) * Math.cos(lat1),
    Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [lat2 * (180 / Math.PI), lon2 * (180 / Math.PI)];
}

function validateLonLat(lon, lat) {
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

function addListItem(listId, itemId, text) {
  const list = document.getElementById(listId);
  const item = document.createElement('li');
  if (itemId) item.id = itemId;
  item.textContent = text;
  list.appendChild(item);
}

function sortCoordinatesClockwise(points) {
  const centroid = points.reduce(
    (total, point) => [total[0] + point[0], total[1] + point[1]],
    [0, 0]
  ).map(value => value / points.length);

  return points.sort((a, b) => {
    const angleA = Math.atan2(a[1] - centroid[1], a[0] - centroid[0]);
    const angleB = Math.atan2(b[1] - centroid[1], b[0] - centroid[0]);
    return angleA - angleB;
  });
}

function removeDuplicatePoints(points) {
  const seen = new Set();
  return points.filter(point => {
    const key = `${point[0]},${point[1]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function updateGpsHistoryList(points) {
  document.getElementById('CordHistory').innerHTML = '';
  removeDuplicatePoints(points).slice().reverse().forEach(point => {
    addListItem('CordHistory', '', `${point[0]}, ${point[1]}`);
  });
}

function loadGpsHistory(lat, lon) {
  const savedKeys = Object.keys(localStorage)
    .filter(key => key.startsWith('GPS '))
    .sort((a, b) => Number(a.split(' ')[1]) - Number(b.split(' ')[1]));

  polyPoints = savedKeys.map(key => {
    const [savedLat, savedLon] = localStorage.getItem(key).split(',', 2);
    return [Number(savedLat), Number(savedLon)];
  });

  const isDuplicate = polyPoints.some(point => point[0] === lat && point[1] === lon);

  if (!isDuplicate) {
    polyPoints.push([lat, lon]);
    const nextIndex = savedKeys.length ? Number(savedKeys[savedKeys.length - 1].split(' ')[1]) + 1 : 1;
    localStorage.setItem(`GPS ${nextIndex}`, `${lat},${lon}`);
  }

  polyPoints = sortCoordinatesClockwise(removeDuplicatePoints(polyPoints));
  updateGpsHistoryList(polyPoints);
}

function getTriangle(lat, lon, distanceKm, bearingDegrees, angleDegrees) {
  const halfAngle = angleDegrees / 2;
  const [endLat1, endLon1] = calculateDestinationPoint(lat, lon, distanceKm, bearingDegrees - halfAngle);
  const [endLat2, endLon2] = calculateDestinationPoint(lat, lon, distanceKm, bearingDegrees + halfAngle);
  return [[lat, lon], [endLat1, endLon1], [endLat2, endLon2]];
}

async function drawShadow(lat, lon, distanceKm, bearingDegrees, angleDegrees, timeMinutes) {
  if (polyPoints.length < 3) return;

  const currentIndex = polyPoints.findIndex(point => point[0] === Number(lat) && point[1] === Number(lon));
  if (currentIndex < 0) return;

  const wind = await getWindData(lat, lon);
  if (!wind || typeof wind.deg !== 'number') return;

  const offset = wind.deg - 180 >= 180 ? 1 : -1;
  const secondaryPoint = polyPoints[currentIndex + offset];
  if (!secondaryPoint) return;

  const firstTriangle = getTriangle(lat, lon, distanceKm, bearingDegrees, angleDegrees);
  const secondaryDistance = wind.speed * 1.609 / 60 * timeMinutes / WIND_SPEED_OFFSET;
  const secondTriangle = getTriangle(secondaryPoint[0], secondaryPoint[1], secondaryDistance, wind.deg - 180, angleDegrees);
  const shadowPoints = sortCoordinatesClockwise(firstTriangle.concat(secondTriangle));

  L.polygon(secondTriangle, { color: '#d94b32', weight: 0, fillOpacity: 0.25 }).addTo(map);
  L.polygon(shadowPoints, { color: '#d94b32', weight: 0, fillOpacity: 0.2 }).addTo(map);
}

function ensureMap(startLat, startLon) {
  if (map) {
    map.setView([startLat, startLon], 13);
    setTimeout(() => map.invalidateSize(), 0);
    return;
  }

  map = L.map('FireMap', {
    center: [startLat, startLon],
    zoom: 13,
    worldCopyJump: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  setTimeout(() => map.invalidateSize(), 0);
}

function clearMapOverlays() {
  if (!map) return;
  map.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Circle) {
      map.removeLayer(layer);
    }
  });
}

function drawMap(startLat, startLon, distanceKm, bearingDegrees, angleDegrees, timeMinutes) {
  ensureMap(startLat, startLon);
  clearMapOverlays();

  const predictionTriangle = getTriangle(startLat, startLon, distanceKm, bearingDegrees, angleDegrees);

  L.marker([startLat, startLon]).addTo(map)
    .bindPopup('Current fire location')
    .openPopup();

  L.polygon(predictionTriangle, { color: '#d94b32', weight: 0, fillOpacity: 0.34 }).addTo(map);
  drawShadow(startLat, startLon, distanceKm, bearingDegrees, angleDegrees, timeMinutes);
}

function drawSavedGpsPoints() {
  if (!map || polyPoints.length === 0) return;

  const bounds = polyPoints.map(coord => L.latLng(coord[0], coord[1]));
  map.fitBounds(bounds, { padding: [24, 24] });

  if (polyPoints.length >= 3) {
    const fireArea = L.polygon(polyPoints, { color: '#f06b22', weight: 1.5, fillOpacity: 0.18 }).addTo(map);

    if (L.GeometryUtil && L.GeometryUtil.geodesicArea) {
      const area = L.GeometryUtil.geodesicArea(fireArea.getLatLngs()[0]);
      const readableArea = L.GeometryUtil.readableArea(area, true);
      addListItem('OutputList', 'Area', `Approximate detected area: ${readableArea}.`);
    }
  }

  polyPoints.forEach((point, index) => {
    L.marker([point[0], point[1]]).addTo(map).bindPopup(`Detection point ${index + 1}`);
  });
}

function drawCircle(lat, lon, radiusMeters) {
  if (!map) return;
  L.circle([lat, lon], {
    color: '#d94b32',
    fillColor: '#d94b32',
    fillOpacity: 0.28,
    radius: radiusMeters
  }).addTo(map);
}

async function GenerateData() {
  const outputText = document.getElementById('OutputText');
  const outputList = document.getElementById('OutputList');
  const latitude = Number(document.getElementById('GPS Lat').value);
  const longitude = Number(document.getElementById('GPS Lon').value);
  const timeInput = Number(document.getElementById('Time').value);
  const timeMinutes = timeInput > 0 ? timeInput : DEFAULT_TIME_MINUTES;

  outputText.textContent = '';
  outputList.innerHTML = '';

  if (!validateLonLat(longitude, latitude)) {
    outputText.textContent = 'Please enter a valid latitude between -90 and 90 and longitude between -180 and 180.';
    return;
  }

  loadGpsHistory(latitude, longitude);

  try {
    const weatherData = await getWindData(latitude, longitude);
    if (!weatherData) throw new Error('No wind data returned.');

    let what3Words = 'Not available';
    try {
      what3Words = await convertCoordinatesTo3Words(latitude, longitude);
    } catch (error) {
      console.info('what3words unavailable:', error);
    }

    const bearing = typeof weatherData.deg === 'number' ? weatherData.deg - 180 : 0;
    const speed = Number(weatherData.speed || 0);
    const distanceKm = speed * 1.609 / 60 * timeMinutes / WIND_SPEED_OFFSET;
    const distanceMeters = (distanceKm * 1000).toFixed(0);

    addListItem('OutputList', 'Info', 'Red shows the predicted fire spread.');
    addListItem('OutputList', 'AreaInfo', 'Orange shows the current detected fire area when three or more points are saved.');
    addListItem('OutputList', 'W3W', `what3words address: ${what3Words}.`);
    addListItem('OutputList', 'WindInfo', `Wind speed: ${speed} m/s. Estimated travel direction: ${bearing}°.`);
    addListItem('OutputList', 'Prediction', `Over ${timeMinutes} minutes, the fire could travel roughly ${distanceMeters} metres.`);

    document.getElementById('Outputs').removeAttribute('hidden');
    drawMap(latitude, longitude, distanceKm, bearing, 30, timeMinutes);
    drawSavedGpsPoints();

    if (speed < 0.5) {
      drawCircle(latitude, longitude, 0.05 * 1.609 / 60 * timeMinutes * WIND_SPEED_OFFSET * 10);
    }
  } catch (error) {
    console.error(error);
    outputText.textContent = 'Unable to generate data right now. Check the coordinates and try again.';
  }
}

function ClearData() {
  polyPoints = [];
  Object.keys(localStorage)
    .filter(key => key.startsWith('GPS '))
    .forEach(key => localStorage.removeItem(key));

  clearMapOverlays();
  document.getElementById('Outputs').setAttribute('hidden', 'hidden');
  document.getElementById('OutputText').textContent = '';
  document.getElementById('OutputList').innerHTML = '';
  document.getElementById('CordHistory').innerHTML = '';
}

function toggleDropdown() {
  const content = document.getElementById('ShowGPSHistory');
  const arrow = document.getElementById('arrow');
  const button = document.getElementById('toggleDropdownDiv');
  content.classList.toggle('open');
  const open = content.classList.contains('open');
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  arrow.classList.toggle('right', !open);
  arrow.classList.toggle('down', open);
}

function getURLParameter(name) {
  return new URLSearchParams(window.location.search).get(name);
}

window.addEventListener('load', () => {
  const lat = getURLParameter('lat');
  const lon = getURLParameter('lon');
  const gps = getURLParameter('gps');

  if (lat && lon) {
    document.getElementById('GPS Lat').value = lat;
    document.getElementById('GPS Lon').value = lon;
  } else if (gps) {
    const [gpsLat, gpsLon] = gps.split(',').map(value => value.trim());
    document.getElementById('GPS Lat').value = gpsLat || '';
    document.getElementById('GPS Lon').value = gpsLon || '';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const historyButton = document.getElementById('toggleDropdownDiv');
  const longitudeInput = document.getElementById('GPS Lon');

  historyButton.addEventListener('click', toggleDropdown);
  longitudeInput.addEventListener('keypress', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      GenerateData();
    }
  });
});
