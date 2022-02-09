let borderPoints = []
let thermalPoints = []
let circleMarker = []
let polygon
let polyMode = true;

// Random value
function rnd(min, max) {

    return Math.random() * (max - min) + min;
}

// Handle on map clicks
function onMapClick(e) {

    if(polyMode == false)
        return

    borderPoints.push(e.latlng)

    if(polygon)
        polygon.remove(map)

    polygon = L.polygon([
        borderPoints
    ]).addTo(map)

}

function resetPolygon(){

    for(var i = 0; i < circleMarker.length; i++){
        circleMarker[i].remove(map)
    }

    circleMarker = []

    if(!polygon)
        return
    
    borderPoints = []
    polygon.remove(map)
}

function generate(){

    thermalPoints = []

    for(var i = 0; i < circleMarker.length; i++){
        circleMarker[i].remove(map)
    }

    circleMarker = []

    if(borderPoints.length < 3)
        return

    let minLat = 200
    let minLng = 200
    let maxLat = -200 
    let maxLng = -200

    // Get min and max lat
    for(var i = 0; i < borderPoints.length; i++){

        let p = borderPoints[i];

        if(p.lat < minLat)
            minLat = p.lat
        
        if(p.lat > maxLat)
            maxLat = p.lat

        if(p.lng < minLng)
            minLng = p.lng

        if(p.lng > maxLng)
            maxLng = p.lng

    }

    // Get min and max lng

    // Get values from ui
    let count = parseInt(document.getElementById("count").value)
    let minHeight = parseInt(document.getElementById("heightMin").value)
    let maxHeight = parseInt(document.getElementById("heightMax").value)
    let minDiameter = parseInt(document.getElementById("diameterMin").value)
    let maxDiameter = parseInt(document.getElementById("diameterMax").value)
    let minSpeed = parseInt(document.getElementById("speedMin").value)
    let maxSpeed = parseInt(document.getElementById("speedMax").value)
    
    // Generate and draw points
    for(var i = 0; i < count; i++){

        let height = rnd(minHeight, maxHeight + 1)
        let diameter = rnd(minDiameter, maxDiameter + 1)
        let speed = rnd(minSpeed, maxSpeed + 1)
        let lat = rnd(minLat, maxLat)
        let lng = rnd(minLng, maxLng)

        thermalPoints.push({"height": height, "diameter": diameter, "speed": speed, "lat": lat, "lng": lng})

        let circle = L.circle([lat, lng], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 200,
            id: i
        }).addTo(map)

        circle.on("mousedown", function(){
            console.log(circle.options.id);
        })
        
        circleMarker.push(circle);
        
    }
    
}

// Initialize map
let map = L.map("map").setView([51.1874, 6.8263], 10)

// Add tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 20,
  minZoom: 2,
  tileSize: 512,
  zoomOffset: -1,
}).addTo(map)

map.on('click', onMapClick)
  