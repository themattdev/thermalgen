let borderPoints = [] // List of points for the border polygon
let circleMarker = [] // List of thermals as circles
let polygon // Polygon on the map for all border points
let mode = 0 // Start in move mode
let lastID = 0
let newLatLng;

/* Util Methods */

/* Calculates random value between min and max (max not included) */
function rnd(min, max) {
    return Math.random() * (max - min) + min
}

/* Rounds to places before comma */
function round(num, places) {
    var multiplier = Math.pow(10, places);
    return Math.round(num * multiplier) / multiplier;
}

/*  Return the angle between two vectors on a plane
    The angle is from vector 1 to vector 2, positive anticlockwise
    The result is between -pi -> pi
    (Rewritten in js from https://www.eecs.umich.edu/courses/eecs380/HANDOUTS/PROJ2/InsidePoly.html) */
function angle2D(x1, y1, x2, y2)
{
   let dtheta,theta1,theta2

   theta1 = Math.atan2(y1,x1)
   theta2 = Math.atan2(y2,x2)
   dtheta = theta2 - theta1

   while (dtheta > Math.PI)
      dtheta -= (2* Math.PI)
   while (dtheta < - Math.PI)
      dtheta += (2* Math.PI)

   return(dtheta)
}

/*  Checks if a given point p lies inside the polygon poly
    (Rewritten in js from https://www.eecs.umich.edu/courses/eecs380/HANDOUTS/PROJ2/InsidePoly.html) */
function insidePolygon(poly, p)
{
    let angle = 0;
    let p1 = {"lat": 0, "lng": 0}
    let p2 = {"lat": 0, "lng": 0}
    let n = poly.length

    // Loop over all points of the border polygone
    for (let i=0; i < n; i++) {
        // Create vectors pair wise for the given point and points of the border polygon
        p1.lat = poly[i].lat - p.lat
        p1.lng = poly[i].lng - p.lng
        p2.lat = poly[(i+1) % n].lat - p.lat
        p2.lng = poly[(i+1) % n].lng - p.lng
        // Sum the angle for the given point and all points for the border polygon
        angle += angle2D(p1.lat,p1.lng,p2.lat,p2.lng)
    }
    
    if (Math.abs(angle) < Math.PI)
        return false
    else
        return true
}

/* Converts degree to radian */
function deg2rad(deg) {
    return deg * (Math.PI/180)
}

/* Calculates distance between two given latlng coordinates in nm */
function distance(lat1, lng1, lat2, lng2) {
    var radiusEarth = 6371 

    var dLat = deg2rad(lat2 - lat1)
    var dLon = deg2rad(lng2 - lng1)
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    var dist = radiusEarth * c * 0.5399568

    return dist
}

function isOverlapping(p1, p2){

    // Calculate distance and convert from km to nm
    let dist = distance(p1.latlng.lat,p1.latlng.lng,p2.latlng.lat,p2.latlng.lng) 

    if(dist < (p1.diameter) || dist < (p2.diameter))
        return true

    return false
}
 
/* Control Methods */

/*  Update the current control mode
    0 = Move, 1 = Poly, 2 = Add, 3 = Delete */
function setMode(newMode){

    mode = newMode

    document.getElementById("moveMode").classList.remove("active");
    document.getElementById("polyMode").classList.remove("active");
    document.getElementById("addMode").classList.remove("active");
    document.getElementById("deleteMode").classList.remove("active");

    switch(mode){
        case 0:
            document.getElementById("moveMode").classList.add("active");
            break;
        case 1:
            document.getElementById("polyMode").classList.add("active");
            break;
        case 2:
            document.getElementById("addMode").classList.add("active");
            break;
        case 3:
            document.getElementById("deleteMode").classList.add("active");
            break;
    }

}

function disablePolyTool(state){
    if(state == true)
        document.getElementById("polyMode").classList.add("hidden")
    else
    document.getElementById("polyMode").classList.remove("hidden")

    if(state == true && mode == 1)
        setMode(0)
}

/* Handles click events for the map */
function onMapClick(e) {
    
    switch(mode){
        case 1:
            // Add geo position to polygon
            borderPoints.push(e.latlng)

            // Remove old polygon
            if(polygon)
                polygon.remove(map)

            // Draw new border polygon
            polygon = L.polygon([
                borderPoints
            ]).addTo(map)
        break
        case 2:
            showAddDialog(e)
        break
    }
    
    
}

function showAddDialog(e){

    document.getElementById("addDialog").classList.remove("hidden")

    document.getElementById("lat").value = e.latlng.lat.toFixed(5)
    document.getElementById("lng").value = e.latlng.lng.toFixed(5)

    newLatLng = e.latlng
}

function addThermalToMap(id, latlng, height, diameter, speed){

    // Create circle with a popup
    let circle = L.circle([latlng.lat, latlng.lng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: diameter * 0.5 * 1852,
        id: id,
        "height": height,
        "diameter": diameter,
        "speed": speed
    }).addTo(map).bindPopup("Lat " + latlng.lat + "<br>Lng " + latlng.lng + "<br>Height " + height + " m<br>Diameter " + diameter + " nm<br>Speed " + speed + " kn")
    
    // On click handler for deleting thermals
    circle.on("click", function(e){
        if(mode == 3){
            for(var i = 0; i < circleMarker.length; i++){
                if(circleMarker[i].options.id == i){
                    circleMarker.splice(i, 1)
                    document.getElementById("pointCount").value = circleMarker.length
                    break
                }
            }
            map.removeLayer(circle)
            return
        }
    })

    // Add listener to allow moving circle
    circle.on({
        mousedown: function () {
            map.on('mousemove', function (e) {

                if(mode > 0)
                    return

                circle.setLatLng(e.latlng)
                circle.bindPopup("Lat " + e.latlng.lat + "<br>Lng " + e.latlng.lng + "<br>Height " + circle.options.height + " m<br>Diameter " + circle.options.diameter + " nm<br>Speed " + circle.options.speed + " kn")
                map.dragging.disable();
            })
        }
    })

    map.on('mouseup',function(e){
        map.removeEventListener('mousemove')
        map.dragging.enable();
    })

    circleMarker.push(circle)

    document.getElementById("pointCount").value = circleMarker.length

}

/* Called by ui to add a single thermal */
function addThermal(){

    document.getElementById("addDialog").classList.add("hidden")

    let height = parseInt(document.getElementById("height").value)
    let diameter = parseFloat(document.getElementById("diameter").value).toFixed(1)
    let speed = parseInt(document.getElementById("speed").value)

    height = Math.round(height / 100) * 100
    speed = Math.round(speed)

    addThermalToMap(lastID, newLatLng, height, diameter, speed)

    lastID++
}

/* Cancel the add thermal dialog */
function cancelDialog(){

    document.getElementById("addDialog").classList.add("hidden")
    
}

/* Clears all thermals and removes the border polygon */
function reset(){

    // Remove thermals
    for(var i = 0; i < circleMarker.length; i++){
        circleMarker[i].remove(map)
    }

    circleMarker = []

    // Remove polygon if it exist
    if(!polygon)
        return
    
    borderPoints = []
    polygon.remove(map)

    document.getElementById("pointCount").value = 0

    disablePolyTool(false)

}

/* Generate geo positions in a given range for lat and lng */
function generatePositions(count, minLat, maxLat, minLng, maxLng, minDiameter, maxDiameter){

    let positions = []

    let i = 0;

    let iterationTimeout = 1000
    let iterationCount = 0

    // Generation
    GenerationLoop:
    while(i < count  && iterationCount < iterationTimeout){

        // Generate random position and diameter
        let lat = rnd(minLat, maxLat)
        let lng = rnd(minLng, maxLng)
        let latlng = {"lat": lat, "lng": lng}
        let diameter = rnd(minDiameter, maxDiameter).toFixed(1)

        // Skip point if it was not generated inside the border polygon
        if(!insidePolygon(borderPoints, latlng))
        {   
            iterationCount++
            continue GenerationLoop
        }
            
        let p = {"latlng": latlng, "diameter": diameter}

        // Compare all points with each other
        OuterLoop:
        for(i = 0; i < positions.length; i++){

            // Remove points if they are overlapping and restart loop
            if(isOverlapping(positions[i], p))
            {
                iterationCount++
                continue GenerationLoop
            }
                
        }
        
        positions.push(p)

        iterationCount = 0

        i++

    }
            
    return positions

}

/* Generates thermals inside the border polygon and displays them on the map */
function generateThermals(){

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
    for(let i = 0; i < borderPoints.length; i++){

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

    // Get values from ui
    let count = parseInt(document.getElementById("count").value)
    let minHeight = parseInt(document.getElementById("heightMin").value)
    let maxHeight = parseInt(document.getElementById("heightMax").value)
    let minDiameter = parseFloat(document.getElementById("diameterMin").value)
    let maxDiameter = parseFloat(document.getElementById("diameterMax").value)
    let minSpeed = parseInt(document.getElementById("speedMin").value)
    let maxSpeed = parseInt(document.getElementById("speedMax").value)
    
    // Generate positions with diameters
    let positions = generatePositions(count, minLat, maxLat, minLng, maxLng, minDiameter, maxDiameter)

    for(var i = 0; i < positions.length; i++){

        // Read position and diameter
        let latlng = positions[i].latlng
        let diameter = positions[i].diameter

        // Generate other parameters
        let height = Math.round(rnd(minHeight, maxHeight + 1) / 100) * 100
        let speed = Math.round(rnd(minSpeed, maxSpeed + 1))

        addThermalToMap(i, latlng, height, diameter, speed)
        
        lastID = i
        
    }

    disablePolyTool(true)
    
}

function dumpStyle(){
    let testElemt = document.getElementById("downBtn")
    var cs = window.getComputedStyle(testElemt,null);
    var len = cs.length;
    for (var i=0;i<len;i++) {

        var style = cs[i];
        console.log(style+" : "+cs.getPropertyValue(style));
    }
}


function loadBoarder(file){


    if (file.files && file.files[0]) {
        let reader = new FileReader();
        reader.readAsBinaryString(file.files[0]);
        reader.onload = function (e) {
            
            let dataFile = e.target.result

            let lbreak = dataFile.split("\n")

            borderPoints = []

            lbreak.forEach(res => {
                borderPoints.push(res.split(","));
            });

            if(polygon)
                polygon.remove(map)
                

            // Draw new border polygon
            polygon = L.polygon([
                borderPoints
            ]).addTo(map)
                    
        }
    }
}

/* Convert all circle markers into csv data and auto download it */
function saveAsCSV(option) {
 
    var csv_data = []

    let fileName = ''

    switch(option){
    
        case 'thermals':
            for (var i = 0; i < circleMarker.length; i++) {
        
                let circle = circleMarker[i]
                
                var row = 'Location, ,thermal,' + circle._latlng.lat.toFixed(5) + ',' + circle._latlng.lng.toFixed(5) + ',' + circle.options.height + ', ,' + circle.options.diameter + ' ' + circle.options.speed
        
                csv_data.push(row)
            }
            fileName = 'Thermal.csv'
        break;
        case 'border':

            if (borderPoints.length == 0)
                return;

            for (var i = 0; i < borderPoints.length; i++) {
        
                let borderPoint = borderPoints[i]
                
                let row = borderPoint.lat + ',' + borderPoint.lng
        
                csv_data.push(row)
            }
            fileName = 'Border.csv'
        break;
        default:
            return
            break;
    }

    csv_data = csv_data.join('\n')
 
    downloadCSVFile(csv_data, fileName)
}

/* https://www.geeksforgeeks.org/how-to-export-html-table-to-csv-using-javascript/ */
/* Download a csv file with the given data */
function downloadCSVFile(csv_data, filename) {
    
    // Create object from data
    CSVFile = new Blob([csv_data], { type: "text/csv" });
    
    // Create an invisible link with reference to the file
    var tmpLink = document.createElement('a');
 
    tmpLink.download = filename;
    var url = window.URL.createObjectURL(CSVFile);
    tmpLink.href = url;
 
    tmpLink.style.display = "none";
    document.body.appendChild(tmpLink);

    // Auto click on the link and remove it
    tmpLink.click();
    document.body.removeChild(tmpLink);
}

function showChangelog(state){

    if(state == true)
    {
        document.getElementById('changeLog').classList.remove('hidden')
        return
    }
        
    document.getElementById('changeLog').classList.add('hidden');
}

// Initialize map
let map = L.map("map").setView([56.08385, -4.53681], 13)

// Add tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 20,
  minZoom: 2,
  tileSize: 512,
  zoomOffset: -1,
}).addTo(map)

map.on('click', onMapClick)
  