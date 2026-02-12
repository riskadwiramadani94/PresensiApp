export const getLeafletHTML = (initialLat: number = -6.2088, initialLng: number = 106.8456) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Pilih Lokasi</title>
  
  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body, html {
      height: 100%;
      width: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #map {
      height: 100%;
      width: 100%;
    }
    
    .loading-overlay {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 9999;
      display: none;
    }
    
    .loading-overlay.show {
      display: block;
    }
    
    .leaflet-top.leaflet-left {
      top: 120px !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="loading" class="loading-overlay">Mengambil alamat...</div>
  
  <!-- Leaflet JS -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  
  <script>
    // Inisialisasi peta
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${initialLat}, ${initialLng}], 13);
    
    // Tambah zoom control dengan posisi custom
    L.control.zoom({
      position: 'topleft'
    }).addTo(map);
    
    // Tambah tiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    
    // Variable untuk marker
    let marker = null;
    let userLocationCircle = null;
    let userLocationDot = null;
    
    // Loading overlay
    const loadingEl = document.getElementById('loading');
    
    function showLoading() {
      loadingEl.classList.add('show');
    }
    
    function hideLoading() {
      loadingEl.classList.remove('show');
    }
    
    // Function reverse geocoding
    async function reverseGeocode(lat, lng) {
      showLoading();
      
      try {
        const response = await fetch(
          \`https://nominatim.openstreetmap.org/reverse?lat=\${lat}&lon=\${lng}&format=json&addressdetails=1\`,
          {
            headers: {
              'User-Agent': 'HadirinApp/1.0'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Gagal mengambil alamat');
        }
        
        const data = await response.json();
        
        let address = data.display_name || 'Alamat tidak ditemukan';
        
        // Kirim data ke React Native
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            latitude: lat,
            longitude: lng,
            address: address
          }));
        }
        
        hideLoading();
      } catch (error) {
        console.error('Geocoding error:', error);
        hideLoading();
        
        // Kirim data tanpa alamat jika gagal
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            latitude: lat,
            longitude: lng,
            address: 'Alamat tidak dapat diambil'
          }));
        }
      }
    }
    
    // Event listener klik peta
    map.on('click', function(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      
      // Hapus marker lama jika ada
      if (marker) {
        map.removeLayer(marker);
      }
      
      // Tambah marker baru
      marker = L.marker([lat, lng], {
        draggable: false
      }).addTo(map);
      
      // Panggil reverse geocoding
      reverseGeocode(lat, lng);
    });
    
    // Listen untuk pesan dari React Native (untuk clear marker dan move to location)
    document.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        
        if (data.action === 'setUserLocation') {
          // Tampilkan lokasi user dengan circle biru
          if (userLocationCircle) {
            map.removeLayer(userLocationCircle);
            map.removeLayer(userLocationDot);
          }
          
          userLocationCircle = L.circle([data.latitude, data.longitude], {
            color: '#4285F4',
            fillColor: '#4285F4',
            fillOpacity: 0.15,
            weight: 2,
            radius: 50
          }).addTo(map);
          
          userLocationDot = L.circleMarker([data.latitude, data.longitude], {
            color: '#fff',
            fillColor: '#4285F4',
            fillOpacity: 1,
            radius: 8,
            weight: 3
          }).addTo(map);
          
          map.setView([data.latitude, data.longitude], 15);
        }
        else if (data.action === 'addMarkerAtUserLocation') {
          if (marker) {
            map.removeLayer(marker);
          }
          marker = L.marker([data.latitude, data.longitude]).addTo(map);
          map.setView([data.latitude, data.longitude], 16);
        }
        else if (data.action === 'moveToLocation') {
          if (marker) {
            map.removeLayer(marker);
          }
          map.setView([data.latitude, data.longitude], 16);
          marker = L.marker([data.latitude, data.longitude]).addTo(map);
        }
      } catch (e) {
        if (event.data === 'clearMarker' && marker) {
          map.removeLayer(marker);
          marker = null;
        }
      }
    });
    
    // Untuk iOS
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        
        if (data.action === 'setUserLocation') {
          if (userLocationCircle) {
            map.removeLayer(userLocationCircle);
            map.removeLayer(userLocationDot);
          }
          
          userLocationCircle = L.circle([data.latitude, data.longitude], {
            color: '#4285F4',
            fillColor: '#4285F4',
            fillOpacity: 0.15,
            weight: 2,
            radius: 50
          }).addTo(map);
          
          userLocationDot = L.circleMarker([data.latitude, data.longitude], {
            color: '#fff',
            fillColor: '#4285F4',
            fillOpacity: 1,
            radius: 8,
            weight: 3
          }).addTo(map);
          
          map.setView([data.latitude, data.longitude], 15);
        }
        else if (data.action === 'addMarkerAtUserLocation') {
          if (marker) {
            map.removeLayer(marker);
          }
          marker = L.marker([data.latitude, data.longitude]).addTo(map);
          map.setView([data.latitude, data.longitude], 16);
        }
        else if (data.action === 'moveToLocation') {
          if (marker) {
            map.removeLayer(marker);
          }
          map.setView([data.latitude, data.longitude], 16);
          marker = L.marker([data.latitude, data.longitude]).addTo(map);
        }
      } catch (e) {
        if (event.data === 'clearMarker' && marker) {
          map.removeLayer(marker);
          marker = null;
        }
      }
    });
  </script>
</body>
</html>
  `;
};
