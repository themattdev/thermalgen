let borderPoints = [] // List of points for the border polygon
let borderHoles = [] // List of all holes in the border polygon
let holeIndex = -1
let circleMarker = [] // List of thermals as circles
let thermals = [] // List of thermals
let polygon // Polygon on the map for all border points
let holePolygon
let mode = 0 // Start in move mode
let lastID = 0
let newLatLng
let history = []
let isPolyToolActive = true

const thermalScale = 2.1

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

/*  Checks if a given point lies inside a polygone                                                      */
/*  (Rewritten in js from https://www.eecs.umich.edu/courses/eecs380/HANDOUTS/PROJ2/InsidePoly.html)    */
/* poly: Polygon                                                                                        */
/* p: Point                                                                                             */
function isInsidePolygon(poly, p)
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

/* Converts degree to radian    */
/* deg: degree                  */
function deg2rad(deg) {
    return deg * (Math.PI/180)
}

/* Calculates distance between two given latlng coordinates in nautic miles */
/* lat1: latitude of point A                                                */
/* lng: longitude of point A                                                */
/* lat2: latitude of point B                                                */
/* lng2: longitude of point B                                               */
function distance(lat1, lng1, lat2, lng2) {

    let radiusEarth = 6371 

    let dLat = deg2rad(lat2 - lat1)
    let dLon = deg2rad(lng2 - lng1)

    let a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    let dist = radiusEarth * c * 0.5399568

    return dist
}

/* Checks if two given points are overlapping   */
/* p1: Point 1                                  */
/* p2: Point 2                                  */
function isOverlapping(p1, p2){

    // Calculate distance and convert from km to nm
    let dist = distance(p1.latlng.lat,p1.latlng.lng,p2.latlng.lat,p2.latlng.lng) 

    if(dist < (p1.diameter * thermalScale) || dist < (p2.diameter * thermalScale))
        return true

    return false
}

/* Updates the active state of all ui control elements */
function updateUIControls(){

    document.getElementById("moveMode").classList.remove("active");
    document.getElementById("polyMode").classList.remove("active");
    document.getElementById("addMode").classList.remove("active");
    document.getElementById("deleteMode").classList.remove("active");
    document.getElementById("holeMode").classList.remove("active");

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
        case 4:
            document.getElementById("holeMode").classList.add("active");
            break;

    }

}

/* Set the hidden state of a given dom element                          */
/* id: html id of the element                                           */
/* hide: true => element will be hidden, false => element will be shown */
function setElementHiddenState(id, hide){

    if(hide == true)
        document.getElementById(id).classList.add("hidden")
    else
        document.getElementById(id).classList.remove("hidden")
}

/* Shows the dialog for manually adding a thermal location  */
/* e: Mouse event of map on click event                     */
function showAddDialog(e){

    document.getElementById("addDialog").classList.remove("hidden")

    document.getElementById("lat").value = e.latlng.lat.toFixed(5)
    document.getElementById("lng").value = e.latlng.lng.toFixed(5)

    newLatLng = e.latlng
}

/* Updates the current control mode                             */
/* newMode:   0 = Move, 1 = Poly, 2 = Add, 3 = Delete, 4 = Cut  */
function setMode(newMode){

    mode = newMode

    if(mode == 4){
        holeIndex += 1
            borderHoles.push([])
    }

    updateUIControls()

}

/* Sets the state of the poly tool */
/* state: true = activate, false = disable */
function setPolyToolState(state){

    setElementHiddenState("polyMode", !state)
    setElementHiddenState("holeMode", !state)

    isPolyToolActive = state

    if(state == false && mode == 1)
        setMode(0)
}

/* Clears all map markers */
function clearMarkers(){

    for(var i = 0; i < circleMarker.length; i++){
        circleMarker[i].remove(map)
    }

}

/* Reverts all global values to the last step in the history */
function undo(){

    if(history.length == 0)
        return

    clearMarkers()

    // Load values
    let step = history.pop()

    borderPoints = step.borderPoints.slice()
    borderHoles =  step.borderHoles.slice()
    holeIndex =  step.holeIndex
    thermals = step.thermals.slice()
    isPolyToolActive = step.isPolyToolActive

    setPolyToolState(isPolyToolActive)

    drawBorder()

    circleMarker = []

    // Draw thermals
    for(var i = 0; i < thermals.length; i++){
        let t = thermals[i]
        addThermalToMap(t.id, t.latlng, t.height, t.diameter, t.speed)
    }

}

/* Adds a new step to the history */
function addHistory(){

    let oldBorderHoles = []

    for (var i = 0; i < borderHoles.length; i++)
        oldBorderHoles[i] = borderHoles[i].slice();

    let step = {
        'borderPoints': borderPoints.slice(),
        'borderHoles': oldBorderHoles,
        'holeIndex': holeIndex,
        'thermals': thermals,
        'isPolyToolActive': isPolyToolActive
    }

    history.push(step)
}

/* Handles click events for the map */
function onMapClick(e) {
    
    switch(mode){
        case  1:
            addHistory()
            // Add geo position to polygon
            borderPoints.push(e.latlng)

            drawBorder()
        break
        case 2:
            showAddDialog(e)
        break
        case 4:
            addHistory()

            borderHoles[holeIndex].push(e.latlng)

            drawBorder()
        break
    }
    
}

/* Draws the border polygon and border holes */
function drawBorder(){

    if(polygon)
        polygon.remove(map)

    if(holePolygon)
        holePolygon.remove(map)
    
    // Draw new border polygon
    polygon = L.polygon([
        borderPoints
        
    ]).addTo(map)

    holePolygon = L.polygon([
        borderHoles
    ], {color:'green'}).addTo(map)
}

/* Adds a thermal to the map and registers needed listener  */
/* id: thermal id                                           */
/* latlng: latlng coordinates                               */
/* height: height of the thermal                            */
/* diameter: diameter of the thermal                        */
/* speed: speed of the thermal                              */
function addThermalToMap(id, latlng, height, diameter, speed){

    // Create circle with a popup
    let circle = L.circle([latlng.lat, latlng.lng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: diameter * 0.5 * 1852 * thermalScale,
        id: id,
        "height": height,
        "diameter": diameter,
        "speed": speed
    }).addTo(map).bindPopup("Lat " + latlng.lat + "<br>Lng " + latlng.lng + "<br>Height " + height + " m<br>Diameter " + diameter + " nm<br>Speed " + speed + " kn")
    
    // On click handler for deleting thermals
    circle.on("click", function(e){
        if(mode == 3){
            console.log('Delete' + circleMarker.length)
            for(var i = 0; i < circleMarker.length; i++){
                if(circleMarker[i].options.id == id){
                    circleMarker.splice(i, 1)
                    thermals.splice(i, 1)
                    console.log(thermals.length)
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

/* Adds a single thermal defined by ui parameters */
function addThermal(){

    addHistory()

    document.getElementById("addDialog").classList.add("hidden")

    let height = parseInt(document.getElementById("height").value)
    let diameter = parseFloat(document.getElementById("diameter").value).toFixed(1)
    let speed = parseInt(document.getElementById("speed").value)

    height = Math.round(height / 100) * 100
    speed = Math.round(speed)

    let t = {
        'id': lastID,
        'latlng': newLatLng,
        'height': height,
        'diameter': diameter,
        'speed': speed
    }

    thermals.push(t)

    addThermalToMap(lastID, newLatLng, height, diameter, speed)

    lastID++
}

/* Clears all thermals and removes the border polygon */
function reset(){

    setElementHiddenState('resetDialog', true)

    // Remove thermals
    clearMarkers()

    circleMarker = []
    borderPoints = []
    borderHoles = []
    history = []
    holeIndex = -1

    // Remove polygon if it exist
    if(polygon)
        polygon.remove(map)

    if(holePolygon)
        holePolygon.remove(map)

    document.getElementById("pointCount").value = 0

    setPolyToolState(true)

    setMode(0)

}

/* Generate geo positions in a given range for lat and lng  */
/* count: Number of geo positions to generate               */
/* minLat: Minimal latitude                                 */
/* maxLat: Maximal latitude                                 */
/* minLng: Minimal longitude                                */
/* maxLng: Maximal longitude                                */
/* minDiamter: Minimal diameter                             */
/* maxDiameter: Maximal diameter                            */
/*                                                          */
/* Note: Geopositions must not be overlapping. Depending    */
/*       on the lat, lng and diameter settings it might     */
/*       not be possible to generate all positions defined  */
/*       by count                                           */
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
        if(!isInsidePolygon(borderPoints, latlng))
        {   
            iterationCount++
            continue GenerationLoop
        }

        // Skip point if it was generated inside a hole polygon
        for(i = 0; i < borderHoles.length; i++){
            if(isInsidePolygon(borderHoles[i], latlng))
                continue GenerationLoop
        }
            
        let p = {"latlng": latlng, "diameter": diameter}

        // Compare all points with each other
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

/* Generates thermals inside the border polygon and outside the border holes and displays them on the map */
function generateThermals(){

    if(borderPoints.length < 3)
        return

    addHistory()

    clearMarkers()

    circleMarker = []
    thermals = []

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

        let t = {
            'id': i,
            'latlng': latlng,
            'height': height,
            'diameter': diameter,
            'speed': speed
        }
        
        thermals.push(t)

        addThermalToMap(i, latlng, height, diameter, speed)
        
        lastID = i
        
    }

    setPolyToolState(false)
    
}


function load(fileList){

    if(!fileList)
        return

    if (fileList.files && fileList.files[0]) {

        let file = fileList.files[0]

        let fileExtention = file.name.split('.')[1].toLowerCase()

        if(fileExtention === "bon")
            loadBorder(file)
        else if(fileExtention === "csv")
            loadThermals(file)

    }

    // Reset value of file element otherwise the same file cant be uploaded twice
    document.getElementById('upload').value = ''

}

/* Loads border and border hole data from a given file */
function loadBorder(file){

    
        let reader = new FileReader();
        reader.readAsBinaryString(file);
        reader.onload = function (e) {
            
        let dataFile = e.target.result

        let lbreak = dataFile.split("\n")

        addHistory()

        // Empty global arrays
        borderPoints = []
        borderHoles = []
        hole = []
        borderComplete = false;

        for(var i = 0; i < lbreak.length; i++){

            let line = lbreak[i]

            // Skip first header
            if(line.startsWith('border'))
                continue

            // Create new hole
            if(line.startsWith('hole')){
                if(borderComplete == true)
                    borderHoles.push(hole)
                
                borderComplete = true;
                holeIndex += 1
                hole = []
                continue
            }

            let p = {'lat': parseFloat(line.split(",")[0]), 'lng': parseFloat(line.split(",")[1])}

                // Add points to border
            if(borderComplete == false)
                borderPoints.push(p)
            else
                hole.push(p)
        }

        if(hole.length > 0)
            borderHoles.push(hole)

        drawBorder()
                    
        
    }

}

/* Loads thermal data from a given file */
function loadThermals(file){

    let reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = function (e) {
        
        let dataFile = e.target.result

        let lbreak = dataFile.split("\n")

        addHistory()

        // Empty global arrays and clear markers
        clearMarkers()

        circleMarker = []
        thermals = []
        lastID = 0

        for(var i = 0; i < lbreak.length; i++){

            let line = lbreak[i].split(",")

            let p = {'lat': parseFloat(line[3]), 'lng': parseFloat(line[4])}

            let t = {
                'id': lastID,
                'latlng': p,
                'height': line[5],
                'diameter': line[7].split(" ")[0],
                'speed': line[7].split(" ")[1]
            }

            console.log(t)
        
            thermals.push(t)
        
            addThermalToMap(t.id, t.latlng, t.height, t.diameter, t.speed)

            lastID++;
            

        }
                
    }
   
}

/* Convert thermal or border data and auto downloads it     */
/* option = thermals or border                              */
function saveAsCSV(option) {
 
    var csv_data = []

    let fileName = ''

    switch(option){
    
        case 'thermals':
            // Convert all thermals
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

            csv_data.push('border')
            
            // Convert border polygon
            for (var i = 0; i < borderPoints.length; i++) {
        
                let borderPoint = borderPoints[i]
                
                let row = borderPoint.lat + ',' + borderPoint.lng
        
                csv_data.push(row)
            }
            
            // Convert border holes
            for(var i = 0; i < borderHoles.length; i++){
                csv_data.push('hole_' + i)

                let hole = borderHoles[i];

                for(var j = 0; j < hole.length; j++){

                    let row = hole[j].lat + ',' + hole[j].lng
        
                    csv_data.push(row)

                }
            }

            fileName = 'Border.bon'
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

// Register on click handler
map.on('click', onMapClick)
  