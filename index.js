let map, autocomplete;
let currentLocationLabel = '';
let currentLocation = null;

const LIPAGAS_WA_NUMBER = '254112250250';

// --- Sheet refs ---
const sheet = document.getElementById('reviewSheet');
const sheetAddress = document.getElementById('sheetAddress');
const sheetCoords = document.getElementById('sheetCoords');
const sheetChangeBtn = document.getElementById('sheetChangeBtn');
const sheetConfirmBtn = document.getElementById('sheetConfirmBtn');

// --- UI refs for search + overlay (resolved after DOM since script is defer) ---
const searchContainer = document.getElementById("searchContainer");
const locationInput = document.getElementById("locationInput");
const clearInputBtn = document.getElementById("clearInputBtn");
const mapOverlay = document.getElementById("mapOverlay");

// --- Pulse helpers ---
const startPulse = () => searchContainer?.classList.add("pulse");
const stopPulse  = () => searchContainer?.classList.remove("pulse");

// --- Bottom Sheet controls ---
function openSheet() {
  if (!sheet) return;
  sheet.classList.remove('hidden');
  requestAnimationFrame(() => sheet.classList.add('open'));
  sheet.setAttribute('aria-hidden', 'false');
}

function closeSheet(event) {
  if (!sheet) return;
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  setTimeout(() => sheet.classList.add('hidden'), 280);

  if (event?.target?.id === "sheetChangeBtn") {
    currentLocation = null;
    currentLocationLabel = "";
    const btn = document.querySelector('button.set-location-btn');
    if (btn) {
      btn.textContent = "Share My Location";
      btn.setAttribute("disabled", "true");
    }
    mapOverlay?.classList.remove("hidden");
    startPulse();
  }
}

// --- Set location + prepare sheet preview ---
function setLocation(label, lat, lng) {
  currentLocationLabel = label;
  currentLocation = { lat, lng };

  if (lat && lng) {
    const btn = document.querySelector('button.set-location-btn');
    if (btn) {
      btn.removeAttribute('disabled');
      btn.textContent = "Review & Send";
    }

    if (sheetAddress) sheetAddress.textContent = label || 'Selected location';
    if (sheetCoords)  sheetCoords.textContent  = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    mapOverlay?.classList.add("hidden");
    stopPulse();
  }
}

// --- WhatsApp handoff ---
function sendCurrentLocationToWhatsApp() {
  if (currentLocation !== null) {
    const { lat, lng } = currentLocation;
    window.location = `https://wa.me/${LIPAGAS_WA_NUMBER}?text=${encodeURIComponent(`${currentLocationLabel} ${lat},${lng}`)}`;
  } else {
    alert('Select your delivery location');
  }
}

// --- Map init (callback from Google Maps API) ---
function initMap() {
  const defaultLoc = { lat: -1.271, lng: 36.804 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLoc,
    zoom: 15,
    disableDefaultUI: true,
  });

  const input = document.getElementById("locationInput");
  autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo("bounds", map);

  const marker = new google.maps.Marker({ map, draggable: true });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place || !place.geometry) return;
    map.panTo(place.geometry.location);
    marker.setPosition(place.geometry.location);
    const label = place.formatted_address || place.name || 'Selected place';
    setLocation(label, place.geometry.location.lat(), place.geometry.location.lng());
  });

  marker.addListener('dragend', () => {
    const position = marker.getPosition();
    if (!position) return;
    map.panTo(position);
    marker.setPosition(position);
    setLocation('Dropped pin', position.lat(), position.lng());
  });

  document.getElementById("locateBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        map.panTo(loc);
        marker.setPosition(loc);
        setLocation('Current Location', loc.lat, loc.lng);

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: loc }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            document.getElementById("locationInput").value = results[0].formatted_address;
            setLocation(results[0].formatted_address, loc.lat, loc.lng);
          }
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          alert("Please allow location access in your browser settings or type your location above.");
        } else {
          alert("Failed to retrieve location. Try again.");
        }
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  document.querySelector("button.set-location-btn").addEventListener("click", (e) => {
    if (currentLocation) {
      openSheet();
    } else {
      sendCurrentLocationToWhatsApp();
    }
  });

  startPulse();
  mapOverlay?.classList.remove("hidden");

  const isLocationSelected = () => !!currentLocation;
  const isInputEmpty      = () => locationInput.value.trim() === "";

  function hideOverlayAndStopPulse() {
    stopPulse();
    mapOverlay?.classList.add("hidden");
  }

  locationInput.addEventListener("focus", hideOverlayAndStopPulse);
  locationInput.addEventListener("input", () => {
    if (isInputEmpty()) {
      startPulse();
      mapOverlay?.classList.remove("hidden");
      clearInputBtn.style.display = "none"; // hide when empty
    } else {
      hideOverlayAndStopPulse();
      clearInputBtn.style.display = "flex"; // show when typing
    }
  });
  searchContainer.addEventListener("click", hideOverlayAndStopPulse);

  if (clearInputBtn) {
    clearInputBtn.addEventListener("click", () => {
      locationInput.value = "";
      startPulse();
      clearInputBtn.style.display = "none";
      if (!isLocationSelected()) {
        mapOverlay?.classList.remove("hidden");
      }
    });
  }

  document.addEventListener("click", (e) => {
    const clickedInsideSearch = searchContainer.contains(e.target);
    const clickedInPAC = !!e.target.closest?.('.pac-container');
    if (!clickedInsideSearch && !clickedInPAC && !isLocationSelected() && isInputEmpty()) {
      startPulse();
      mapOverlay?.classList.remove("hidden");
    }
  });

  locationInput.addEventListener("blur", () => {
    if (!isLocationSelected() && isInputEmpty()) {
      startPulse();
      mapOverlay?.classList.remove("hidden");
      clearInputBtn.style.display = "none";
    }
  });
}

sheetChangeBtn?.addEventListener('click', (e) => closeSheet(e));
sheetConfirmBtn?.addEventListener('click', () => {
  closeSheet();
  sendCurrentLocationToWhatsApp();
});

sheet?.addEventListener('click', (e) => {
  if (e.target.matches('[data-close-sheet]')) closeSheet();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
});

window.initMap = initMap;
