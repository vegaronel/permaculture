    // Initialize the map
    var map = L.map('map').setView([14.1024, 122.9483], 13);
   
    // Add a tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
       attribution: '&copy; '
    }).addTo(map);
    
    // Add a marker in the center of the map
    var marker = L.marker(map.getCenter(), {
       draggable: true // Allow dragging of the marker
    }).addTo(map);
 
    // Initialize marker position in hidden input fields
    document.getElementById('latitude').value = marker.getLatLng().lat;
    document.getElementById('longitude').value = marker.getLatLng().lng;
 
    // Update hidden input fields when marker is dragged
    marker.on('dragend', function(e) {
       document.getElementById('latitude').value = marker.getLatLng().lat;
       document.getElementById('longitude').value = marker.getLatLng().lng;
    });

    // Use Geolocation API to set the map to the user's current location
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(function(position) {
          var userLat = position.coords.latitude;
          var userLng = position.coords.longitude;
          map.setView([userLat, userLng], 13);
          marker.setLatLng([userLat, userLng]);

          // Update hidden input fields with current location
          document.getElementById('latitude').value = userLat;
          document.getElementById('longitude').value = userLng;
       }, function(error) {
          console.error("Error getting location: " + error.message);
       });
    } else {
       console.error("Geolocation is not supported by this browser.");
    }