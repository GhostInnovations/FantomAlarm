// Api's
const W3WapiKey = 'IWL04U57';
const WindapiKey = '24b4bee5cfc7eb51d2141edba1c273ba';

//? Function convert GPS Cords to What3Words address
async function convertCoordinatesTo3Words(lat, lon) {
    var url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lon}&key=${W3WapiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        if (data.words) {
            return data.words; // Return data.words if available
        } else {
            throw new Error('Invalid response from API');
        }
    } catch (error) {
        console.error('W3W Error:', error);
        throw error; // Propagate the error further
    }
}

//? Function gets the weather data for GPS Cords
async function getWindData(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WindapiKey}`;

    try {
        const response = await fetch(url);

        if (response.status === 200) {
            const data = await response.json();
            return data.wind;
        } else if (response.status === 401) {
            document.getElementById('Output').innerText = 'Error 401: Unauthorized. Check your API key.';
        } else {
            document.getElementById('Output').innerText = `Error ${response.status}: ${response.statusText}`;
        }
    } catch (error) {
        console.error("Weather Error:", error);
    }
}

let map; // Global variable to keep track of the map instance

function calculateDestinationPoint(lat, lon, distance, bearing) {
// Function to calculate destination point given start point, bearing, and distance
    const R = 6371; // Earth's radius in kilometers
    const bearingRad = bearing * (Math.PI / 180); // Convert bearing to radians
    const distanceRad = distance / R; // Angular distance in radians

    const lat1 = lat * (Math.PI / 180); // Convert latitude to radians
    const lon1 = lon * (Math.PI / 180); // Convert longitude to radians

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceRad) + Math.cos(lat1) * Math.sin(distanceRad) * Math.cos(bearingRad));
    const lon2 = lon1 + Math.atan2(Math.sin(bearingRad) * Math.sin(distanceRad) * Math.cos(lat1), Math.cos(distanceRad) - Math.sin(lat1) * Math.sin(lat2));

    return [lat2 * (180 / Math.PI), lon2 * (180 / Math.PI)]; // Convert back to coordinates
}

//? Instantiate the map
function DrawMap(startLat, startLon, distance, bearing, angle,Time) {

    // Calculate the edge points of the cone
    const halfAngle = angle / 2;
    const [endLat1, endLon1] = calculateDestinationPoint(startLat, startLon, distance, bearing - halfAngle);
    const [endLat2, endLon2] = calculateDestinationPoint(startLat, startLon, distance, bearing + halfAngle);
    
    
    if (!map) {
        // Initialize the map and set its view to the starting coordinates and zoom level
        
        document.getElementById("FireMap").style.borderRadius = "10px";
        document.getElementById("FireMap").style.width = "100%";
        document.getElementById("FireMap").style.paddingBottom = "100%";
        
        
        
        map = L.map('FireMap', {
            center: [startLat, startLon],
            zoom: 13,
            worldCopyJump: true
        });
        

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    } else {
        // Move the map to the new coordinates
        map.setView([startLat, startLon], 13);
    }
    
    // document.getElementById('bgCanvas').height = document.body.clientHeight;
    // document.getElementById('bgCanvas').width = document.body.clientWidth;
    // init();

    // Clear existing layers (if any)
    map.eachLayer(function (layer) {
        if (layer instanceof L.Marker || layer instanceof L.Polygon) {
            map.removeLayer(layer);
        }
    });

    // Plot the starting point
    L.marker([startLat, startLon]).addTo(map)
        .bindPopup('Fire location currently.')
        .openPopup();

    // Draw a cone between the starting and ending points
    L.polygon([[startLat, startLon], [endLat1, endLon1], [endLat2, endLon2]], { color: 'red', weight: 0}).addTo(map);

    if(PolyPoints.length >= 3){
        GetShadow(startLat,startLon,distance,bearing,30,Time);
    }
}
//? Gets shadowed fire prediction
async function GetShadow(lat,lon,distance,bearing,angle,Time){
 
    function findIndex(arr, item) {
        for (let i = 0; i < arr.length; i++) {
            if (arr[i][0] === item[0]) {
                if (arr[i][1] === item[1])
                return i;
            }
        }
        return "ARG"; // Return -1 if the item is not found
    }

    function GetTriangle(lat,lon,distance,bearing,angle) {
        const [endLat1, endLon1] = calculateDestinationPoint(lat, lon, distance, bearing - angle / 2);
        const [endLat2, endLon2] = calculateDestinationPoint(lat, lon, distance, bearing + angle / 2);
        return [[lat,lon],[endLat1,endLon1],[endLat2,endLon2]];   
    }
    
    const SecondWeatherData = await getWindData(lat, lon);
    var Offset = 0;
    if (SecondWeatherData.deg - 180 >= 180) Offset = 1;
    else Offset = -1;

    var [lat1,lon1] = PolyPoints[findIndex(PolyPoints,[Number(lat),Number(lon)]) + Offset]; //!Not Work

    var FirstPoints = GetTriangle(lat,lon,distance,bearing,angle);


    var SecondPoints = GetTriangle(lat1,lon1,SecondWeatherData.speed * 1.609 / 60 * Time / WindSpeedOffset,SecondWeatherData.deg -180,angle);

    L.polygon(SecondPoints, { color: 'red' , weight: 0}).addTo(map); //* Draw the second triangle  
    var TotalPoints = sortCordsClockwise(FirstPoints.concat(SecondPoints));
    L.polygon(TotalPoints, {color: 'red', weight: 0}).addTo(map); //* Draw the shadow
}

//? Function makes sure Lat and Lon are correct
function validateLonLat(lon,lat){
    if(lon >= -180 && lon <= 180)
        if (lat >= -90 &&  lat <= 90){
            return true;
        }
    return false;
}

//? Function to add infomation to output list (Bullets)
function addListItem(lid,id,text){
    var ul = document.getElementById(lid);
    var newli = document.createElement('li');
    newli.id = id;
    newli.textContent = text;
    ul.appendChild(newli);
}

//? Function to calculate the centre of the coordinates
function sortCordsClockwise(Polys){   

    // Function to calculate centroid
    function calculateCentroid(coords) {
        let cx = 0, cy = 0;
        for (let i = 0; i < coords.length; i++) {
            cx += coords[i][0];
            cy += coords[i][1];
        }
        cx /= coords.length;
        cy /= coords.length;
        return [cx, cy];
    }

    // Function to calculate angle between centroid and a point
    function calculateAngle(point, centroid) {
        return Math.atan2(point[1] - centroid[1], point[0] - centroid[0]);
    }

    // Calculate centroid
    var centroid = calculateCentroid(Polys);

    // Sort coordinates by angle in clockwise direction
    return Polys.sort((a, b) => {
        return calculateAngle(a, centroid) - calculateAngle(b, centroid);
    });
}


//? Add all previous GPS Cords to the dropdown list in the output section
async function addGPSCordstoDropdownList(PolyPoints){
    document.getElementById("CordHistory").innerHTML = "";
    removePolyPointDuplicates();
    for (let index = PolyPoints.length - 1; index >= 0; index--) {
        const PolyPoint = PolyPoints[index];
        // addListItem("CordHistory","",`${PolyPoint[0]},      ${PolyPoint[1]},        ${await convertCoordinatesTo3Words(PolyPoint[0],PolyPoint[1])}`);
        addListItem("CordHistory","",`${PolyPoint[0]},      ${PolyPoint[1]},        What3Words is not currently working`);
    }
}


function removePolyPointDuplicates(){
    var PolyDup = PolyPoints
    PolyDup = PolyPoints.filter((value,index) => PolyPoints.indexOf(value) === index)
    PolyPoints = PolyDup;
}

var PolyPoints = [];
function LoadGPSHistory(lat,lon){

    //* Sort the gps based on what came first
    var GPSCords = [];

    Object.keys(localStorage).forEach(function(key) {
        if (key != "GPS Origin")
            GPSCords.push(key);
    });

    GPSCords.sort((a, b) => {
        const numA = parseInt(a.split(' ')[1]);
        const numB = parseInt(b.split(' ')[1]);
        return numA - numB;
      });

    //* Add points to list and plot markers on map
    PolyPoints = [];
    for (let index = 0; index < GPSCords.length; index++) {
        const GPSCord = GPSCords[index];
        //? Use localstorage.getitem(GPSCord)        
        const LatLon = localStorage.getItem(GPSCord).split(",",2);

        const PolyPoint = [Number(LatLon[0]),Number(LatLon[1])];
        PolyPoints.push(PolyPoint);

        // L.marker([LatLon[0], LatLon[1]]).addTo(map)
        // .bindPopup(`Fire Detected. GPS Index ${index}`);
    }

    var IsDuplicate = PolyPoints.some(PolyPoint => {return PolyPoint[0] === lat && PolyPoint[1] === lon;});
    if (!IsDuplicate){
        PolyPoints.push([lat,lon]);
    }
    else{
        IsDuplicate = true;
    }
    addGPSCordstoDropdownList(PolyPoints);


    PolyPoints = sortCordsClockwise(PolyPoints)


    if (!IsDuplicate){

        //* Add the latest GPS Cord to the list
        if(GPSCords.length == 0)
            var NewKey = "GPS 1";
        else{
            
            var NewKeyNumber = Number(GPSCords[GPSCords.length - 1].split(" ")[1]) + 1  
            var NewKey = `GPS ${NewKeyNumber}`;
        }
        var NewItem = lat+","+lon;
    
        localStorage.setItem(NewKey,NewItem);
    }

}

//? Plot the all GPS cords on map and updates list 
function getSavedGPSCords() {

    function createAreaTooltip(layer) {
        if(layer.areaTooltip) {
            return;
        }

        layer.areaTooltip = L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'area-tooltip'
        });

        layer.on('remove', function(event) {
            layer.areaTooltip.remove();
        });

        layer.on('add', function(event) {
            updateAreaTooltip(layer);
            layer.areaTooltip.addTo(map);
        });

        if(map.hasLayer(layer)) {
            updateAreaTooltip(layer);
            layer.areaTooltip.addTo(map);
        }
    }

    function updateAreaTooltip(layer) {
        var area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
        var readableArea = L.GeometryUtil.readableArea(area, true);
        addListItem("OutputList","Area",`The area of the square is ${readableArea}`);
        var latlng = layer.getCenter();
        layer.areaTooltip
            .setContent(readableArea)
            .setLatLng(latlng);
    }



    const bounds = PolyPoints.map(coord => L.latLng(coord[0], coord[1]));
    map.fitBounds(bounds);

    //* Connect all the points together 
    var FireArea = L.polygon(PolyPoints,{color: "orange", weight: 1.5}).addTo(map);
    if (PolyPoints.length >= 3){
        createAreaTooltip(FireArea);
    }

    for (let index = 0; index < PolyPoints.length; index++) {
        L.marker([PolyPoints[index][0], PolyPoints[index][1]]).addTo(map)
        .bindPopup(`Fire Detected. GPS Index ${index}`);
    }

}

function DrawCircle(lat,lon,distance) {
    var circle = L.circle([lat,lon], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: distance
    }).addTo(map);  
}

//? Function to generate and display output
const WindSpeedOffset = 34.1
async function GenerateData() {
    
    var Latitude = Number(document.getElementById("GPS Lat").value); // Sensors
    var Longitude = Number(document.getElementById("GPS Lon").value); // Sensors
    var Time = document.getElementById("Time").value; // Sensors
    if (Number(Time) === 0){
        Time = 15;
    }
    
    if (validateLonLat(Longitude,Latitude) == true) {
        LoadGPSHistory(Latitude,Longitude);
        try {
            // const w3w = await convertCoordinatesTo3Words(Latitude, Longitude);
            const w3w = "What3Words is not currently working"

            const weatherData = await getWindData(Latitude, Longitude);

            if (weatherData) {
                // Clear previous outputs
                document.getElementById("OutputText").innerText = "";
                document.getElementById("OutputList").innerHTML = '';
            
                // Add initial information items
                addListItem("OutputList","Info",`The red is predicted fire spread.`);
                addListItem("OutputList","Info",`The orange is current fire area.`);
                addListItem("OutputList","W3W",`The What3Words address of the fire is ${w3w}.`);
                addListItem("OutputList","Wind Info", `The windspeed is ${weatherData.speed} mph with a direction of ${weatherData.deg - 180}°.`);
                addListItem("OutputList","Prediction", `Over a ${Time} minute period, the fire will roughly travel ${((weatherData.speed * 1.609 * Time / 60 / WindSpeedOffset).toFixed(4) * 1000).toFixed(0)} meters.`);
            
                // Get the selected weather condition from the dropdown
                //const weatherCondition = document.getElementById("WeatherCondition").value;
            
                // Define a mapping of weather conditions to fire spread chances
                //% let fireSpreadChance = 0;
               // switch(weatherCondition) {
                 //   case 'sunny':
                   //     fireSpreadChance = 85; // High chance of fire spread in sunny conditions
                     //   break;
                    //case 'rainy':
                      //  fireSpreadChance = 20; // Low chance of fire spread in rainy conditions
                      //  break;
                    //case 'windy':
                       // fireSpreadChance = 90; // Very high chance of fire spread in windy conditions
                     //   break;
                    //case 'foggy':
                      //  fireSpreadChance = 40; // Moderate chance of fire spread in foggy conditions
                      //  break;
                    //case 'snowy':
                      //  fireSpreadChance = 10; // Very low chance of fire spread in snowy conditions
                        //break;
                    //default:
                      //  fireSpreadChance = 50; // Default value if no weather condition is selected
                        //break;
                //}
            
                // Add the fire spread chance to the output list
              //  addListItem("OutputList","Fire Spread Chance", `The fire has a ${fireSpreadChance}% chance of spreading given the current weather conditions: ${weatherCondition}.`);
            
                // Show the output section
                document.getElementById("Outputs").removeAttribute("hidden");
            
                
                
                DrawMap(Latitude, Longitude, weatherData.speed * 1.609 / 60 * Time / WindSpeedOffset, weatherData.deg -180,30,Time);
                
                getSavedGPSCords(); //Check if duplicate
                
                if(weatherData.speed < 0.5){
                    DrawCircle(Latitude,Longitude,0.05 * 1.609 / 60 * Time * WindSpeedOffset * 10);
                }

            
            } else {
                document.getElementById("OutputText").innerText = "Failed to get wind data.";
            }
        } catch (error) {
            console.error(error);
            document.getElementById("OutputText").innerText = "Error generating data. See console for details.";
        }
    } 
    else {
        document.getElementById("OutputText").innerText = "Please enter valid latitude and longitude.";
    }
}

//? Clear gps cord history
function ClearData() {
    // Clear local storage
    PolyPoints = [];
    localStorage.clear();

    // Clear all markers and polygons from the map
    if (map) {
        map.eachLayer(function (layer) {
            if (layer instanceof L.Marker || layer instanceof L.Polygon) {
                map.removeLayer(layer);
            }
        });
    }
    

    document.getElementById("Outputs").setAttribute("hidden","hidden");
    document.getElementById('bgCanvas').height = Math.max(document.body.clientHeight,window.innerHeight);;
    document.getElementById('bgCanvas').width = document.body.clientWidth;
    init();
}

//? Toggle dropdown for GPS history
function toggleDropdown() {
    var content = document.getElementById("ShowGPSHistory");
    var arrow = document.getElementById("arrow");
    content.classList.toggle('open');
    if (content.classList.contains('open')) {
        arrow.classList.remove('right');
        arrow.classList.add('down');
    } else {
        arrow.classList.remove('down');
        arrow.classList.add('right');
    }
}

//? Auto fill cords from url into input box
function getURLParameter(name) {
    return new URLSearchParams(window.location.search).get(name);
}

window.onload = function() {
    const lat = getURLParameter('lat');
    const lon = getURLParameter('lon');
    const gps = getURLParameter('gps');

    if (lat && lon) {
        document.getElementById('GPS Lat').value = lat;
        document.getElementById('GPS Lon').value = lon;
    }
    else if (gps){
        latlong = gps.split(", ");
        document.getElementById('GPS Lat').value = latlong[0];
        document.getElementById('GPS Lon').value = latlong[1];    
    }
};

window.addEventListener('DOMContentLoaded', () => {
    let displayMode = 'browser tab';
    if (window.matchMedia('(display-mode: standalone)').matches) {
      displayMode = 'standalone';
    }

    if (displayMode == 'standalone'){
        document.getElementById("DownloadButt").setAttribute("hidden","hidden");
    }
  });

  
document.addEventListener('DOMContentLoaded', function() {
    var myDiv = document.getElementById('toggleDropdownDiv');
    myDiv.addEventListener('click', toggleDropdown);
  });
  
  
// Le button worke
// Get the input field
var inputLon = document.getElementById("GPS Lon");

// Execute a function when the user presses a key on the keyboard
inputLon.addEventListener("keypress", function(event) {
  // If the user presses the "Enter" key on the keyboard
  if (event.key === "Enter") {
    // Cancel the default action, if needed
    event.preventDefault();
    // Trigger the button element with a click
    GenerateData()
  }
});