
let map, autocomplete;

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

  const marker = new google.maps.Marker({
    map,
    position: defaultLoc,
    draggable: true
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;
    map.panTo(place.geometry.location);
    marker.setPosition(place.geometry.location);
  });

  document.getElementById("locateBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    // Ask for permission
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        map.setCenter(loc);
        marker.setPosition(loc);

        // Reverse geocode to get the address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: loc }, (results, status) => {
          if (status === "OK" && results[0]) {
            document.getElementById("locationInput").value = results[0].formatted_address;
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
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });


}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

const locationInputField = document.getElementById("locationInput");
const clearBtn = document.getElementById("clearInputBtn");

locationInputField.addEventListener("input", () => {
  clearBtn.style.display = locationInputField.value ? "flex" : "none";
});

clearBtn.addEventListener("click", () => {
  locationInputField.value = "";
  clearBtn.style.display = "none";
  locationInputField.focus();
});

const setLocationBtn = document.querySelector(".set-location-btn");
const locateBtn = document.getElementById("locateBtn");

locationInputField.addEventListener("focus", () => {
  setLocationBtn.classList.add("keyboard-up");
  locateBtn.classList.add("keyboard-up");
  mapContainer.classList.add("keyboard-blur");
});

locationInputField.addEventListener("blur", () => {
  setLocationBtn.classList.remove("keyboard-up");
  locateBtn.classList.remove("keyboard-up");
});

const mapContainer = document.getElementById("map");

locationInputField.addEventListener("blur", () => {
  setLocationBtn.classList.remove("keyboard-up");
  locateBtn.classList.remove("keyboard-up");
  mapContainer.classList.remove("keyboard-blur");
});

locationInputField.addEventListener("blur", () => {
  mapContainer.classList.remove("keyboard-blur");
});
