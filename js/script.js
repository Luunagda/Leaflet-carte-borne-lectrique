$(document).ready(function(){
    $.ajax({
        url: "json/data.json",
        method: "GET",
        dataType: "json",
        success: function(data){
            console.log(data);
            var mymap = L.map('mapid', {
                zoomControl: false
            })
            .setView([ -21.2763100, 166.4572000], 8);
            
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mymap);
            L.control.zoom({
                position: 'bottomright'
            }).addTo(mymap);
            var markers = [];
            click = false;
            
            $.each(data.results, function(index, borne){
                let marker = L.marker([borne.geo_point_2d.lat, borne.geo_point_2d.lon]).addTo(mymap);

                var pane = mymap.createPane('fixed', document.getElementById('mapid'));

                var popup = L.popup({
                    pane: 'fixed',
                    maxHeight: '100%',
                    className: 'popup-fixed',
                    autoPan: false,
                }).setContent(
                    '<h2>' + borne.nom_station + '</h2><br>' +
                    '<p><svg class="pins" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>' + borne.adresse_station + '</p>' + 
                    '<button id="itineraire-borne" data-lat="'+borne.geo_point_2d.lat+'" data-lon="'+borne.geo_point_2d.lon+'">Itinéraire</button>'
                );
                marker.bindPopup(popup);
                //console.log(borne)
                //console.log(marker);
                markers.push({
                    marker: marker,
                    data: borne
                });
                marker.on('popupopen', function() {
                    var popup = marker.getPopup();
                    var itineraire_borne = popup.getElement().querySelector('#itineraire-borne');
                    var lat = itineraire_borne.getAttribute('data-lat');
                    var lon = itineraire_borne.getAttribute('data-lon');
                    itineraire_borne.addEventListener('click', function() {
                        click = !click;
                        itineraire.innerHTML = "Fermer l'itinéraire";
                        navigator.geolocation.getCurrentPosition((position) => {
                            console.log(position.coords.latitude, position.coords.longitude);
                            mymap.closePopup();
                            routingControl  = L.Routing.control({
                                waypoints: [
                                L.latLng(position.coords.latitude, position.coords.longitude),
                                L.latLng(lat, lon)
                                ]
                            }).addTo(mymap);
                            routingControl.on('routingerror', function(e) {
                                console.log('Routing error:', e.error.message);
                                if (e.error.message === "HTTP request failed: undefined") {
                                    alert("L'itinéraire est impossible. Veuillez réessayer avec d'autres points de départ et d'arrivée.");
                                    document.getElementsByClassName('leaflet-routing-container')[0].remove();
                                    routingControl.setWaypoints([]);
                                    mymap.closePopup();
                                    click = !click;
                                    itineraire.innerHTML = 'Itinéraire vers la borne la plus proche';
                                }
                            });
                        });
                    });
                });
            });
            
            markers.forEach(function(markerObj) {
                markerObj.marker.addTo(mymap);
            });
            //console.log(markers);
            searchbar = document.getElementById('searchbar');
            itineraire = document.createElement('button');
            itineraire.innerHTML = 'Itinéraire vers la borne la plus proche';
            itineraire.id = 'itineraire';
            searchbar.parentNode.insertBefore(itineraire, searchbar.nextSibling);
            searchbar.addEventListener('input', function() {
                var searchText = $(this).val().toLowerCase();
                
                markers.forEach(function(markerObj) {
                    mymap.removeLayer(markerObj.marker);
                });
                
                var filteredMarkers = markers.filter(function(markerObj) {
                    for (var key in markerObj.data) {
                        if (typeof markerObj.data[key] === 'string' && markerObj.data[key].toLowerCase().includes(searchText)) {
                            return true;
                        }
                    }
                    return false;
                });
                
                filteredMarkers.forEach(function(markerObj) {
                    markerObj.marker.addTo(mymap);
                });
            });

            document.getElementById('itineraire').addEventListener('click', function() {
                click = !click;
                if (click) {
                    itineraire.innerHTML = "Fermer l'itinéraire";
                    navigator.geolocation.getCurrentPosition((position) => {
                        console.log(position.coords.latitude, position.coords.longitude);
                        var gj = [];
                        data.results.forEach(function(borne){
                            //console.log(borne.geo_shape);
                            gj.push(borne.geo_shape);
                        });
                        var nearest = leafletKnn(L.geoJSON(gj)).nearestLayer(L.latLng(position.coords.latitude, position.coords.longitude),1); 
                        
                        console.log(nearest);
                        if (nearest.length > 0) {
                            var nearestMarker = nearest[0].layer;
                            var markerLatLng = nearestMarker.getLatLng();
                            var zoomLevel = 14; 
                            console.log(markerLatLng);
                            mymap.setView(markerLatLng, zoomLevel);
                            routingControl  = L.Routing.control({
                                waypoints: [
                                L.latLng(position.coords.latitude, position.coords.longitude),
                                L.latLng(markerLatLng.lat, markerLatLng.lng)
                                ]
                            }).addTo(mymap);
                            routingControl.on('routingerror', function(e) {
                                console.log('Routing error:', e.error.message);
                                if (e.error.message === "HTTP request failed: undefined") {
                                    alert("L'itinéraire est impossible. Veuillez réessayer avec d'autres points de départ et d'arrivée.");
                                    document.getElementsByClassName('leaflet-routing-container')[0].remove();
                                    routingControl.setWaypoints([]);
                                    mymap.closePopup();
                                    click = !click;
                                    itineraire.innerHTML = 'Itinéraire vers la borne la plus proche';
                                }
                            });
                        }
                    });
                } else {
                    itineraire.innerHTML = 'Itinéraire vers la borne la plus proche';
                    document.getElementsByClassName('leaflet-routing-container')[0].remove();
                    routingControl.setWaypoints([]);
                    mymap.closePopup();
                }
                
            });
            
            
        },
        error: function(xhr, status, error){
                console.log("Error:", error);
        }
    });
});