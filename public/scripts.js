// Random background image loader (desktop only)
const backgroundImages = [
  "aerial-forest-landscape.webp",
  "coastal-cliffs-ocean.webp",
  "desert-canyon-formation.webp",
  "earth-crust.webp",
  "lake-mountain-reflection.webp",
  "mountain-valley-vista.webp",
];

function loadRandomBackground() {
  // Only load background images on desktop (768px and up)
  if (window.innerWidth > 768) {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    const selectedImage = backgroundImages[randomIndex];
    document.body.style.backgroundImage = `url("/images/${selectedImage}")`;
    console.log(`🌍 Loaded background: ${selectedImage}`);
  }
}

// Load page setup when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("🌍 Page loaded, checking Leaflet...");
  console.log("🌍 Leaflet available:", typeof L !== "undefined");
  if (typeof L !== "undefined") {
    console.log("🌍 Leaflet version:", L.version);
  }
  loadRandomBackground();
  setupLocationAutocomplete();

  // Initialize recent searches after DOM is ready
  window.recentSearches = new RecentSearches();
});

// Handle window resize to manage background images
window.addEventListener("resize", function () {
  if (window.innerWidth <= 768) {
    // Remove background image on mobile/tablet
    document.body.style.backgroundImage = "none";
  } else {
    // Reload background image on desktop
    loadRandomBackground();
  }
});

// Setup autocomplete for location input
let isAutocompleteSetup = false; // Prevent duplicate setup

function setupLocationAutocomplete() {
  // Only setup once to prevent duplicate event listeners
  if (isAutocompleteSetup) {
    return;
  }

  const input = document.getElementById("location-input-field");
  const suggestionsDiv = document.getElementById("autocomplete-suggestions");
  let debounceTimer;

  input.addEventListener("input", function (e) {
    const query = e.target.value.trim();

    clearTimeout(debounceTimer);

    if (query.length < 3) {
      suggestionsDiv.style.display = "none";
      return;
    }

    // Debounce the API calls
    debounceTimer = setTimeout(() => {
      searchLocations(query, suggestionsDiv);
    }, 300);
  });

  // Clear input when user focuses to type a new location
  input.addEventListener("focus", function (e) {
    if (e.target.placeholder.includes("Current:")) {
      e.target.value = "";
      e.target.placeholder = "e.g. 87501 or Santa Fe, NM";
    }
  });

  // Hide suggestions when clicking outside
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#location-input")) {
      suggestionsDiv.style.display = "none";
    }
  });

  // Handle Enter key
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      useLocationInput();
    }
  });

  isAutocompleteSetup = true;
}

function searchLocations(query, suggestionsDiv) {
  console.log("🔍 Searching for:", query);
  // Try multiple geocoding services for better reliability
  searchWithPhoton(query, suggestionsDiv)
    .catch((error) => {
      console.log("🔍 Photon failed:", error.message);
      return searchWithMapbox(query, suggestionsDiv);
    })
    .catch((error) => {
      console.log("🔍 Local search failed:", error.message);
      console.warn("🔍 All autocomplete services failed");
      suggestionsDiv.style.display = "none";
    });
}

function searchWithPhoton(query, suggestionsDiv) {
  // Use Photon geocoder (Komoot's alternative to Nominatim)
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    query
  )}&limit=5&osm_tag=place`;

  console.log("🔍 Trying Photon API:", url);
  return fetch(url)
    .then((res) => {
      console.log("🔍 Photon response:", res.status);
      if (!res.ok) {
        throw new Error(`Photon API returned ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("🔍 Photon data:", data);
      if (data && data.features && data.features.length > 0) {
        displayPhotonSuggestions(data.features, suggestionsDiv);
      } else {
        throw new Error("No results from Photon");
      }
    });
}

function searchWithMapbox(query, suggestionsDiv) {
  // Fallback to a simple local suggestion system
  console.log("🔍 Using local city database");
  const commonCities = [
    { name: "Santa Fe, NM", lat: 35.687, lon: -105.9378 },
    { name: "Santa Barbara, CA", lat: 34.4208, lon: -119.6982 },
    { name: "Santa Monica, CA", lat: 34.0195, lon: -118.4912 },
    { name: "San Francisco, CA", lat: 37.7749, lon: -122.4194 },
    { name: "San Diego, CA", lat: 32.7157, lon: -117.1611 },
    { name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
    { name: "Seattle, WA", lat: 47.6062, lon: -122.3321 },
    { name: "Portland, OR", lat: 45.5152, lon: -122.6784 },
    { name: "Denver, CO", lat: 39.7392, lon: -104.9903 },
    { name: "Austin, TX", lat: 30.2672, lon: -97.7431 },
    { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074 },
    { name: "Las Vegas, NV", lat: 36.1699, lon: -115.1398 },
    { name: "Salt Lake City, UT", lat: 40.7608, lon: -111.891 },
    { name: "Albuquerque, NM", lat: 35.0844, lon: -106.6504 },
    { name: "Tucson, AZ", lat: 32.2226, lon: -110.9747 },
  ];

  const matches = commonCities.filter((city) =>
    city.name.toLowerCase().includes(query.toLowerCase())
  );

  console.log("🔍 Local matches found:", matches.length);
  if (matches.length > 0) {
    displayLocalSuggestions(matches, suggestionsDiv);
  } else {
    throw new Error("No local matches");
  }
}

function displayPhotonSuggestions(features, suggestionsDiv) {
  const suggestions = features
    .map((feature) => {
      const props = feature.properties;
      const displayName = formatPhotonName(props);

      // Skip if we can't get a good display name
      if (!displayName || displayName === "Unknown location") {
        return null;
      }

      const coords = feature.geometry.coordinates; // [lon, lat] format

      return `
              <div class="suggestion-item" 
                   style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; color: #333;"
                   onmouseover="this.style.backgroundColor='#f0f0f0'"
                   onmouseout="this.style.backgroundColor='white'"
                   onclick="selectLocation('${coords[1]}', '${
        coords[0]
      }', '${displayName.replace(/'/g, "\\'")}')">
                ${displayName}
              </div>
            `;
    })
    .filter((item) => item !== null)
    .join("");

  suggestionsDiv.innerHTML = suggestions;
  suggestionsDiv.style.display = "block";
}

function displayLocalSuggestions(cities, suggestionsDiv) {
  const suggestions = cities
    .map((city) => {
      return `
              <div class="suggestion-item" 
                   style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; color: #333;"
                   onmouseover="this.style.backgroundColor='#f0f0f0'"
                   onmouseout="this.style.backgroundColor='white'"
                   onclick="selectLocation('${city.lat}', '${
        city.lon
      }', '${city.name.replace(/'/g, "\\'")}')">
                ${city.name}
              </div>
            `;
    })
    .join("");

  suggestionsDiv.innerHTML = suggestions;
  suggestionsDiv.style.display = "block";
}

function formatPhotonName(props) {
  // Format location name from Photon API properties
  const parts = [];

  if (props.name) parts.push(props.name);
  if (props.state) parts.push(props.state);

  return parts.length > 0 ? parts.join(", ") : null;
}

function displaySuggestions(locations, suggestionsDiv) {
  const suggestions = locations
    .map((location) => {
      const address = location.address;
      const displayName = formatLocationName(address);

      // Skip "Unknown location" entries
      if (displayName === "Unknown location") {
        return null;
      }

      return `
              <div class="suggestion-item" 
                   style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; color: #333;"
                   onmouseover="this.style.backgroundColor='#f0f0f0'"
                   onmouseout="this.style.backgroundColor='white'"
                   onclick="selectLocation('${location.lat}', '${
        location.lon
      }', '${displayName.replace(/'/g, "\\'")}')">
                ${displayName}
              </div>
            `;
    })
    .filter((item) => item !== null) // Remove null entries
    .join("");

  suggestionsDiv.innerHTML = suggestions;
  suggestionsDiv.style.display = "block";
}

function formatLocationName(address) {
  const city = address.city || address.town || address.village;
  const state = address.state;
  const postcode = address.postcode;

  if (city && state) {
    return postcode ? `${city}, ${state} ${postcode}` : `${city}, ${state}`;
  } else if (address.display_name) {
    // Fallback to simplified display name
    const parts = address.display_name.split(",").slice(0, 3);
    return parts.join(",").trim();
  }
  return "Unknown location";
}

function showLocationConfirmation() {
  const confirmationSection = document.getElementById("location-confirmation");
  const messageDiv = document.getElementById("confirmation-message");

  if (userLocationLabel && userLocationLabel !== "Unknown location") {
    const locationEmoji = getLocationEmoji(userLocationLabel);

    let weatherInfo = "";
    if (currentWeather) {
      weatherInfo = ` It's ${
        currentWeather.temp
      }°F and ${currentWeather.description.toLowerCase()}.`;
    }

    messageDiv.innerHTML = `
            <div class="confirmation-content">
              <h3><span class="confirmation-emoji">${locationEmoji}</span> Today you're in<br class="mobile-break"> ${userLocationLabel} <span class="confirmation-emoji">${locationEmoji}</span></h3>
              <p id="confirmation-description">${weatherInfo} Here are some amazing things to do outside!</p>
            </div>
          `;
    confirmationSection.classList.add("has-data");

    // Smooth scroll to confirmation message after a brief delay
    setTimeout(() => {
      confirmationSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 500);
  }
}

function updateConfirmationWithWeather() {
  const descriptionP = document.getElementById("confirmation-description");
  if (descriptionP && currentWeather) {
    const weatherInfo = ` It's ${
      currentWeather.temp
    }°F and ${currentWeather.description.toLowerCase()}.`;
    descriptionP.textContent = `${weatherInfo} Here are some amazing things to do outside!`;
  }
}

function getLocationEmoji(location) {
  const loc = location.toLowerCase();

  // State/region-specific emojis
  if (loc.includes("alaska") || loc.includes("ak")) return "🐻";
  if (loc.includes("hawaii") || loc.includes("hi")) return "🌺";
  if (loc.includes("florida") || loc.includes("fl")) return "🐊";
  if (loc.includes("california") || loc.includes("ca")) return "🌴";
  if (loc.includes("texas") || loc.includes("tx")) return "🤠";
  if (loc.includes("colorado") || loc.includes("co")) return "🏔️";
  if (loc.includes("montana") || loc.includes("mt")) return "🦬";
  if (loc.includes("wyoming") || loc.includes("wy")) return "🦬";
  if (loc.includes("maine") || loc.includes("me")) return "🦞";
  if (loc.includes("arizona") || loc.includes("az")) return "🌵";
  if (loc.includes("new mexico") || loc.includes("nm")) return "🌵";
  if (loc.includes("nevada") || loc.includes("nv")) return "🏜️";
  if (loc.includes("utah") || loc.includes("ut")) return "🏜️";
  if (loc.includes("minnesota") || loc.includes("mn")) return "🦆";
  if (loc.includes("wisconsin") || loc.includes("wi")) return "🧀";
  if (loc.includes("louisiana") || loc.includes("la")) return "🐊";
  if (loc.includes("washington") || loc.includes("wa")) return "🌲";
  if (loc.includes("oregon") || loc.includes("or")) return "🌲";
  if (loc.includes("idaho") || loc.includes("id")) return "🥔";
  if (loc.includes("michigan") || loc.includes("mi")) return "🏞️";
  if (loc.includes("new york") || loc.includes("ny")) return "🍎";
  if (loc.includes("vermont") || loc.includes("vt")) return "🍁";
  if (loc.includes("new hampshire") || loc.includes("nh")) return "🍁";

  // City-specific emojis
  if (loc.includes("seattle")) return "☕";
  if (loc.includes("portland")) return "🌹";
  if (loc.includes("denver")) return "🏔️";
  if (loc.includes("san francisco") || loc.includes("sf")) return "🌉";
  if (loc.includes("los angeles") || loc.includes("la")) return "🌴";
  if (loc.includes("miami")) return "🏖️";
  if (loc.includes("chicago")) return "🌊";
  if (loc.includes("boston")) return "🦞";
  if (loc.includes("new orleans")) return "🎷";
  if (loc.includes("las vegas")) return "🎰";
  if (loc.includes("nashville")) return "🎸";
  if (loc.includes("austin")) return "🎵";
  if (loc.includes("phoenix")) return "🌵";
  if (loc.includes("salt lake")) return "🏔️";

  // Default nature emoji
  return "🌲";
}

function selectLocation(lat, lng, locationName) {
  const input = document.getElementById("location-input-field");
  const suggestionsDiv = document.getElementById("autocomplete-suggestions");

  input.value = locationName;
  suggestionsDiv.style.display = "none";

  // Set the location and load data
  userLocationLabel = locationName;
  console.log("🗺️ Selected from autocomplete:", locationName);
  initializeMap(parseFloat(lat), parseFloat(lng));

  // Update placeholder to show current location and clear input value
  setTimeout(() => {
    input.value = "";
    input.placeholder = `Current: ${locationName} (click to search new location)`;
  }, 1000);
}

function useLocationInput() {
  const input = document.getElementById("location-input-field");
  const query = input.value.trim();

  console.log("🔍 User input:", query);

  if (!query) {
    alert("Please enter a location!");
    return;
  }

  // Hide suggestions
  const suggestionsDiv = document.getElementById("autocomplete-suggestions");
  if (suggestionsDiv) {
    suggestionsDiv.style.display = "none";
  }

  // Check if it's a ZIP code (5 digits)
  const zipPattern = /^\d{5}$/;
  if (zipPattern.test(query)) {
    console.log("🔍 Using ZIP code path");
    useZipCodeSimple(query);
  } else {
    console.log("🔍 Using city/state search");
    searchAndUseLocation(query);
  }

  // Update placeholder to show current location after processing
  setTimeout(() => {
    const input = document.getElementById("location-input-field");
    input.value = "";
    input.placeholder = `Current: ${userLocationLabel} (click to search new location)`;
  }, 1000);
}

function useZipCodeSimple(zip) {
  console.log("🔍 Looking up ZIP code:", zip);
  fetch(`https://api.zippopotam.us/us/${zip}`)
    .then((res) => {
      if (!res.ok) throw new Error("ZIP code not found.");
      return res.json();
    })
    .then((data) => {
      const latitude = parseFloat(data.places[0].latitude);
      const longitude = parseFloat(data.places[0].longitude);
      const city = data.places[0]["place name"];
      const state = data.places[0]["state abbreviation"];
      userLocationLabel = `${city}, ${state} ${zip}`;

      // Save to recent searches
      console.log("🕒 Extracted ZIP location data for recent searches:", {
        city,
        state,
      });
      window.recentSearches.addSearch(city, state, "United States");

      console.log("🗺️ Initializing map for ZIP...");
      initializeMap(latitude, longitude);
    })
    .catch((error) => {
      console.error("🔍 ZIP lookup error:", error);
      alert("Could not find location for that ZIP code.");
    });
}

function initializeMap(latitude, longitude) {
  console.log("🗺️ Initializing map at:", latitude, longitude);

  // Reset map features for new location
  mapFeatures = {
    earthquakes: { found: false, count: 0, emoji: "🌋" },
    birds: { found: false, count: 0, emoji: "🐦" },
    insects: { found: false, count: 0, emoji: "🦋" },
    parks: { found: false, count: 0, emoji: "🏞️" },
    fossils: { found: false, count: 0, emoji: "🦴" },
    archaeology: { found: false, count: 0, emoji: "🏺" },
    weather: { found: false, emoji: "🌦️" },
  };
  updateMapDescription();

  // Show the welcome message immediately
  showLocationConfirmation();

  // Show the map section now that we have a location
  const mapSection = document.getElementById("map");
  mapSection.classList.add("has-data");

  // Properly destroy existing map if it exists
  if (window.geoMap) {
    console.log("🗺️ Removing existing map...");
    window.geoMap.remove();
    window.geoMap = null;
  }

  // Clear the map container
  document.getElementById("leaflet-map").innerHTML = "";

  // Create new map with scroll wheel zoom disabled
  window.geoMap = L.map("leaflet-map", {
    scrollWheelZoom: false,
  }).setView([latitude, longitude], 10);

  // Add tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(window.geoMap);

  // Initialize activity layer
  activityLayerGroup = L.layerGroup().addTo(window.geoMap);

  // Add user location marker
  addUserLocationPin(latitude, longitude, userLocationLabel);

  // Load data
  loadBedrock(latitude, longitude);
  loadQuakes(latitude, longitude);
  loadSpecies(latitude, longitude);
  loadInsects(latitude, longitude);
  loadArchaeology(latitude, longitude);
  loadFossils(latitude, longitude);
  loadParks(latitude, longitude);
  loadWeather(latitude, longitude);

  console.log("🗺️ Map initialization complete");
}

function useZipCode(zip) {
  console.log("🔍 Looking up ZIP code:", zip);
  fetch(`https://api.zippopotam.us/us/${zip}`)
    .then((res) => {
      if (!res.ok) throw new Error("ZIP code not found.");
      return res.json();
    })
    .then((data) => {
      console.log("🔍 ZIP data received:", data);
      const latitude = parseFloat(data.places[0].latitude);
      const longitude = parseFloat(data.places[0].longitude);
      const city = data.places[0]["place name"];
      const state = data.places[0]["state abbreviation"];
      const locationLabel = `${city}, ${state} ${zip}`;

      // Save to recent searches
      console.log("🕒 Extracted ZIP location data for recent searches:", {
        city,
        state,
      });
      window.recentSearches.addSearch(city, state, "United States");

      console.log(
        "🔍 Calling processLocation with:",
        latitude,
        longitude,
        locationLabel
      );
      processLocation(latitude, longitude, locationLabel);
    })
    .catch((error) => {
      console.error("🔍 ZIP lookup error:", error);
      alert("Could not find location for that ZIP code.");
    });
}

function searchAndUseLocation(query) {
  // Check rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;

  if (timeSinceLastCall < API_COOLDOWN) {
    console.log("🔍 Rate limiting: waiting before API call");
    setTimeout(
      () => searchAndUseLocation(query),
      API_COOLDOWN - timeSinceLastCall
    );
    return;
  }

  lastApiCall = now;

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&addressdetails=1&limit=1&countrycodes=us`;

  console.log("🔍 Searching for location:", query);
  console.log("🔍 API URL:", url);

  fetch(url, {
    headers: {
      "User-Agent": "Nature Events App (github.com/richmalloy/nature-events)",
    },
  })
    .then((res) => {
      console.log("🔍 Response status:", res.status);
      if (!res.ok) {
        throw new Error(`API returned ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("🔍 API response data:", data);
      if (data && data.length > 0) {
        const location = data[0];
        console.log("🔍 Full location object:", location);
        console.log("🔍 Address object:", location.address);

        const latitude = parseFloat(location.lat);
        const longitude = parseFloat(location.lon);
        userLocationLabel = formatLocationName(location.address);

        // Save to recent searches
        const city =
          location.address.city ||
          location.address.town ||
          location.address.village ||
          location.address.county;
        const state = location.address.state;
        const country = location.address.country || "United States";

        console.log("🕒 Extracted location data for recent searches:", {
          city,
          state,
          country,
        });

        if (city && state) {
          window.recentSearches.addSearch(city, state, country);
        } else {
          console.log("🕒 Skipping recent search - missing city or state");
          console.log(
            "🕒 Available address fields:",
            Object.keys(location.address)
          );
        }

        console.log("🗺️ Found location:", userLocationLabel);
        initializeMap(latitude, longitude);

        // Update input placeholder after successful lookup
        const input = document.getElementById("location-input-field");
        setTimeout(() => {
          input.value = "";
          input.placeholder = `Current: ${userLocationLabel} (click to search new location)`;
        }, 1000);
      } else {
        console.log("🔍 No results found for:", query);
        alert("Could not find that location. Please try a different search.");
      }
    })
    .catch((error) => {
      console.error("🔍 Search error:", error);
      alert(
        `Failed to search for location: ${error.message}. Please try again.`
      );
    });
}

function processLocation(latitude, longitude, locationLabel) {
  console.log("🗺️ Processing location:", latitude, longitude, locationLabel);

  // Set the global location label
  userLocationLabel = locationLabel;

  // Properly destroy existing map if it exists
  if (window.geoMap) {
    console.log("🗺️ Removing existing map...");
    window.geoMap.remove();
    window.geoMap = null;
  }

  // Clear the #leaflet-map placeholder before initializing Leaflet
  const mapElement = document.getElementById("leaflet-map");
  console.log("🗺️ Map element found:", mapElement);
  mapElement.innerHTML = "";

  console.log("🗺️ Creating new map...");
  window.geoMap = L.map("leaflet-map", {
    scrollWheelZoom: false,
  }).setView([latitude, longitude], 10);
  setTimeout(() => {
    window.geoMap.invalidateSize();
  }, 150);
  loadMapTiles(window.geoMap);
  console.log("🗺️ Map created and tiles loaded");

  // Clear or initialize activityLayerGroup
  activityLayerGroup = L.layerGroup().addTo(window.geoMap);

  // Add user location marker
  addUserLocationPin(latitude, longitude, locationLabel);

  // Load all data
  loadBedrock(latitude, longitude);
  loadQuakes(latitude, longitude);
  loadSpecies(latitude, longitude);
  loadArchaeology(latitude, longitude);
  loadFossils(latitude, longitude);
  loadParks(latitude, longitude);
  loadWeather(latitude, longitude);
}

// Global variable for weather/location label
let userLocationLabel = "";
let currentWeather = null;
// Global layer group for activity markers
let activityLayerGroup;
// Rate limiting for API calls
let lastApiCall = 0;
const API_COOLDOWN = 1000; // 1 second between calls

// Dynamic map description system
let mapFeatures = {
  earthquakes: { found: false, count: 0, emoji: "🌋" },
  birds: { found: false, count: 0, emoji: "🐦" },
  insects: { found: false, count: 0, emoji: "🦋" },
  parks: { found: false, count: 0, emoji: "🏞️" },
  fossils: { found: false, count: 0, emoji: "🦴" },
  archaeology: { found: false, count: 0, emoji: "🏺" },
  weather: { found: false, emoji: "🌦️" },
};

function updateMapDescription() {
  const descDiv = document.getElementById("map-description");
  const foundFeatures = Object.entries(mapFeatures)
    .filter(([key, data]) => data.found)
    .map(
      ([key, data]) =>
        `${data.emoji} ${data.count > 0 ? `${data.count} ` : ""}${key}`
    );

  if (foundFeatures.length === 0) {
    descDiv.innerHTML =
      "<p>🔍 Select your location to reveal nearby events and features on this interactive map.</p>";
    return;
  }

  const featuresText =
    foundFeatures.length > 1
      ? foundFeatures.slice(0, -1).join(", ") +
        ", and " +
        foundFeatures[foundFeatures.length - 1]
      : foundFeatures[0];

  descDiv.innerHTML = `
          <p>🗺️ Your map is now showing: ${featuresText} around ${userLocationLabel}!</p>
          <p><small style="opacity: 0.8;">Click any pin for detailed information about that location.</small></p>
        `;
}

function useGeolocation() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      console.log("📍 Got coordinates:", latitude, longitude);

      // Reverse geocode with Nominatim to set location label
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      )
        .then((res) => res.json())
        .then((data) => {
          console.log("🗺️ Nominatim response:", data.address);
          const address = data.address;

          // Try to get the best city name, prioritizing city over town/village
          let cityName =
            address.city ||
            address.town ||
            address.village ||
            address.hamlet ||
            address.suburb;
          let stateName = address.state;

          // If we still don't have a good city name, try other fields
          if (!cityName || cityName === "location") {
            cityName = address.municipality || address.county || address.region;
          }

          // Format the location label - prioritize city, state format
          if (cityName && stateName) {
            userLocationLabel = `${cityName}, ${stateName}`;
          } else if (cityName) {
            userLocationLabel = cityName;
          } else if (stateName) {
            userLocationLabel = stateName;
          } else {
            userLocationLabel = "Your location";
          }

          console.log("🗺️ Geolocation resolved to:", userLocationLabel);

          // Save to recent searches if we have valid city/state
          if (cityName && stateName) {
            const country = address.country || "United States";
            console.log("🕒 Saving geolocation to recent searches:", {
              cityName,
              stateName,
              country,
            });
            window.recentSearches.addSearch(cityName, stateName, country);
          }

          initializeMap(latitude, longitude);

          // Update input placeholder after successful geolocation
          const input = document.getElementById("location-input-field");
          setTimeout(() => {
            input.value = "";
            input.placeholder = `Current: ${userLocationLabel} (click to search new location)`;
          }, 1000);
        })
        .catch(() => {
          userLocationLabel = "Your location";
          console.log("🗺️ Using fallback location label");
          initializeMap(latitude, longitude);

          // Update input placeholder even with fallback
          const input = document.getElementById("location-input-field");
          setTimeout(() => {
            input.value = "";
            input.placeholder = `Current: ${userLocationLabel} (click to search new location)`;
          }, 1000);
        });
    },
    () => {
      alert("Failed to get location.");
    }
  );
}
function loadSpecies(lat, lng) {
  const speciesEl = document.getElementById("species-data");
  const speciesSection = document.getElementById("species");
  fetch(`https://api.ebird.org/v2/data/obs/geo/recent?lat=${lat}&lng=${lng}`, {
    headers: {
      "X-eBirdApiToken": "j0j0d58b330k", // Replace with your actual eBird API key
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.length) {
        speciesEl.textContent = "No recent sightings nearby.";
        speciesSection.classList.add("has-data");
        mapFeatures.birds.found = false;
        mapFeatures.birds.count = 0;
        updateMapDescription();
        return;
      }

      mapFeatures.birds.found = true;
      mapFeatures.birds.count = Math.min(data.length, 6);
      updateMapDescription();
      speciesEl.innerHTML =
        `<p>📍 Found ${
          data.slice(0, 6).length
        } birds nearby from the eBird community database</p>
              <ul class="data-list">` +
        data
          .slice(0, 6)
          .map((obs) => {
            const when = new Date(obs.obsDt).toLocaleDateString();
            return `<li class="bird-item">
                    <div>
                      <strong>${obs.comName}</strong><br/>
                      <small style="color: #ccc;">Spotted: ${when}</small>
                    </div>
                  </li>`;
          })
          .join("") +
        "</ul>";

      // Show the section now that it has data
      speciesSection.classList.add("has-data");

      // Add bird markers to the map using addBirdPin
      data.slice(0, 6).forEach((obs) => {
        if (!obs.lat || !obs.lng) return;
        const when = new Date(obs.obsDt).toLocaleDateString();
        const popup = `<strong>� ${obs.comName}</strong><br/><small>Spotted: ${when}</small>`;
        addBirdPin(obs.lat, obs.lng, popup);
      });
    })
    .catch(() => {
      speciesEl.textContent = "Failed to load species data.";
      speciesSection.classList.add("has-data");
      mapFeatures.birds.found = false;
      mapFeatures.birds.count = 0;
      updateMapDescription();
    });
}

function loadInsects(lat, lng) {
  const insectEl = document.getElementById("insect-data");
  const insectSection = document.getElementById("insects");

  // Use iNaturalist API for insect observations
  // taxon_id=47158 is for class Insecta
  fetch(
    `https://api.inaturalist.org/v1/observations?lat=${lat}&lng=${lng}&radius=15&taxon_id=47158&per_page=4&quality_grade=research,needs_id&order=desc&order_by=created_at`
  )
    .then((res) => res.json())
    .then((data) => {
      if (!data.results || data.results.length === 0) {
        insectEl.textContent = "No recent insect observations nearby.";
        insectSection.classList.add("has-data");
        mapFeatures.insects.found = false;
        mapFeatures.insects.count = 0;
        updateMapDescription();
        return;
      }

      mapFeatures.insects.found = true;
      mapFeatures.insects.count = Math.min(data.results.length, 4);
      updateMapDescription();

      insectEl.innerHTML = `
              <p>📍 Found ${
                data.results.length
              } insect observations nearby from the iNaturalist community</p>
              <ul class="data-list">
                ${data.results
                  .map((obs) => {
                    const commonName =
                      obs.taxon?.preferred_common_name ||
                      obs.taxon?.name ||
                      "Unknown species";
                    const scientificName = obs.taxon?.name || "";
                    const date = new Date(
                      obs.observed_on || obs.created_at
                    ).toLocaleDateString();
                    const observer =
                      obs.user?.name || obs.user?.login || "Anonymous";

                    return `
                      <li class="insect-item">
                        <div>
                          <strong>${commonName}</strong>
                          ${
                            scientificName && scientificName !== commonName
                              ? `<br/><em>${scientificName}</em>`
                              : ""
                          }
                          <br/><small style="color: #ccc;">Observed: ${date} by ${observer}</small>
                        </div>
                      </li>
                    `;
                  })
                  .join("")}
              </ul>
            `;

      // Show the section now that it has data
      insectSection.classList.add("has-data");

      // Add insect markers to the map
      data.results.forEach((obs) => {
        if (obs.geojson && obs.geojson.coordinates) {
          const [lng, lat] = obs.geojson.coordinates;
          const commonName =
            obs.taxon?.preferred_common_name ||
            obs.taxon?.name ||
            "Unknown species";
          const scientificName = obs.taxon?.name || "";
          const date = new Date(
            obs.observed_on || obs.created_at
          ).toLocaleDateString();
          const observer = obs.user?.name || obs.user?.login || "Anonymous";

          const popup = `
                  <strong>🦋 ${commonName}</strong>
                  ${
                    scientificName && scientificName !== commonName
                      ? `<br/><em>${scientificName}</em>`
                      : ""
                  }
                  <br/><small>Observed: ${date} by ${observer}</small>
                `;
          addInsectPin(lat, lng, popup);
        }
      });
    })
    .catch((error) => {
      console.error("🦋 iNaturalist API error:", error);
      insectEl.textContent = "Failed to load insect observation data.";
      insectSection.classList.add("has-data");
      mapFeatures.insects.found = false;
      mapFeatures.insects.count = 0;
      updateMapDescription();
    });
}

function loadParks(lat, lng) {
  const parksEl = document.getElementById("parks-data");
  const parksSection = document.getElementById("parks");
  parksEl.innerHTML = `<p>Loading nearby parks and trails...</p>`;

  // NPS API - search for parks within radius
  const npsApiKey = "EJ8nSrh2bYkNAE28U0aBbiEAH9H7X94ek5Hilutb";
  const radius = 600; // miles
  const npsUrl = `https://developer.nps.gov/api/v1/parks?limit=50&start=0&api_key=${npsApiKey}`;

  fetch(npsUrl)
    .then((res) => res.json())
    .then((data) => {
      if (!data.data || data.data.length === 0) {
        parksEl.innerHTML = `<p>No NPS parks found in the area.</p>`;
        parksSection.classList.add("has-data");
        return;
      }

      // Filter parks by distance using lat/lng if available
      const nearbyParks = data.data
        .filter((park) => {
          if (!park.latitude || !park.longitude) return false;
          const parkLat = parseFloat(park.latitude);
          const parkLng = parseFloat(park.longitude);
          if (isNaN(parkLat) || isNaN(parkLng)) return false;

          // Calculate rough distance (simple approximation)
          const distance = haversineDistance(lat, lng, parkLat, parkLng);
          return distance <= radius * 1.60934; // Convert miles to km
        })
        .slice(0, 4); // Limit to 4 closest parks

      if (nearbyParks.length === 0) {
        parksEl.innerHTML = `<p>No NPS parks found within ${radius} miles.</p>`;
        parksSection.classList.add("has-data");
        mapFeatures.parks.found = false;
        mapFeatures.parks.count = 0;
        updateMapDescription();
        return;
      }

      mapFeatures.parks.found = true;
      mapFeatures.parks.count = nearbyParks.length;
      updateMapDescription();

      // Display parks
      parksEl.innerHTML = `
              <p>📍 Found ${
                nearbyParks.length
              } parks nearby from the National Park Service</p>
              <ul class="data-list">
                ${nearbyParks
                  .map(
                    (park) => `
                  <li class="park-item">
                    <div>
                      <strong>${park.fullName}</strong><br/>
                      <small style="color: #ccc;">${
                        park.designation || "National Park Service"
                      }</small><br/>
                      <small style="color: #999;">${
                        park.description
                          ? park.description.substring(0, 100) + "..."
                          : "Click pin on map for details"
                      }</small>
                    </div>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            `;

      // Show the section now that it has data
      parksSection.classList.add("has-data");

      // Add park markers to the map
      nearbyParks.forEach((park) => {
        if (park.latitude && park.longitude) {
          const parkLat = parseFloat(park.latitude);
          const parkLng = parseFloat(park.longitude);
          if (!isNaN(parkLat) && !isNaN(parkLng)) {
            const popup = `
                    <strong>🏞️ ${park.fullName}</strong><br/>
                    <em>${park.designation || "National Park Service"}</em><br/>
                    <small>${
                      park.description
                        ? park.description.substring(0, 150) + "..."
                        : ""
                    }</small>
                    ${
                      park.url
                        ? `<br/><a href="${park.url}" target="_blank" style="color:#2563eb;">Learn more →</a>`
                        : ""
                    }
                  `;
            addParkPin(parkLat, parkLng, popup);
          }
        }
      });
    })
    .catch((error) => {
      console.error("🏞️ NPS API error:", error);
      parksEl.innerHTML = `<p>Failed to load park data. API may be temporarily unavailable.</p>`;
      parksSection.classList.add("has-data");
      mapFeatures.parks.found = false;
      mapFeatures.parks.count = 0;
      updateMapDescription();
    });
}

// Helper function for distance calculation
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function loadFossils(lat, lng) {
  const fossilEl = document.getElementById("fossil-data");
  const fossilSection = document.getElementById("fossils");
  fossilEl.innerHTML = `<p>Loading nearby fossil discoveries...</p>`;

  // Paleobiology Database API - search for fossils within radius
  // Using a 600 mile radius (roughly 9 degrees at mid-latitudes)
  const radius = 9;
  const minLat = lat - radius;
  const maxLat = lat + radius;
  const minLng = lng - radius;
  const maxLng = lng + radius;

  const pbdbUrl = `https://paleobiodb.org/data1.2/occs/list.json?latmin=${minLat}&latmax=${maxLat}&lngmin=${minLng}&lngmax=${maxLng}&show=coords,time,class&limit=20`;

  console.log("🦴 Fossil search URL:", pbdbUrl);

  fetch(pbdbUrl)
    .then((res) => res.json())
    .then((data) => {
      console.log("🦴 Fossil API response:", data);
      if (!data.records || data.records.length === 0) {
        fossilEl.innerHTML = `<p>No fossil discoveries found within 600 miles.</p>`;
        fossilSection.classList.add("has-data");
        mapFeatures.fossils.found = false;
        mapFeatures.fossils.count = 0;
        updateMapDescription();
        return;
      }

      const fossils = data.records.slice(0, 3); // Limit to 3 fossils
      mapFeatures.fossils.found = true;
      mapFeatures.fossils.count = fossils.length;
      updateMapDescription();

      // Display fossils
      fossilEl.innerHTML = `
              <p>📍 Found ${
                fossils.length
              } fossil discoveries nearby from the Paleobiology Database</p>
              <ul class="data-list">
                ${fossils
                  .map((fossil) => {
                    const age =
                      fossil.eag && fossil.lag
                        ? `${fossil.eag.toFixed(1)} - ${fossil.lag.toFixed(
                            1
                          )} Ma`
                        : fossil.oei || "Unknown age";
                    const taxon =
                      fossil.tna || fossil.idn || "Unknown organism";
                    const classification = fossil.cll ? ` (${fossil.cll})` : "";

                    return `
                      <li class="fossil-item">
                        <div>
                          <strong>${taxon}${classification}</strong><br/>
                          <small style="color: #ccc;">Age: ${age}</small>
                        </div>
                      </li>
                    `;
                  })
                  .join("")}
              </ul>
            `;

      // Show the section now that it has data
      fossilSection.classList.add("has-data");

      // Add fossil markers to the map
      fossils.forEach((fossil) => {
        if (fossil.lat && fossil.lng) {
          const age =
            fossil.eag && fossil.lag
              ? `${fossil.eag.toFixed(1)} - ${fossil.lag.toFixed(1)} Ma`
              : fossil.oei || "Unknown age";
          const taxon = fossil.tna || fossil.idn || "Unknown organism";
          const classification = fossil.cll ? ` (${fossil.cll})` : "";

          const popup = `
                  <strong>🦴 ${taxon}</strong><br/>
                  ${classification ? `<em>${fossil.cll}</em><br/>` : ""}
                  <small>Age: ${age}</small>
                `;
          addFossilPin(fossil.lat, fossil.lng, popup);
        }
      });
    })
    .catch((error) => {
      console.error("🦴 PBDB API error:", error);
      fossilEl.innerHTML = `<p>Failed to load fossil data. API may be temporarily unavailable.</p>`;
      fossilSection.classList.add("has-data");
      mapFeatures.fossils.found = false;
      mapFeatures.fossils.count = 0;
      updateMapDescription();
    });
}

function loadArchaeology(lat, lng) {
  const archEl = document.getElementById("archaeo-data");
  const heritageSection = document.getElementById("heritage");
  archEl.innerHTML = `<p>Loading nearby historical sites...</p>`;

  // First try Wikipedia/Wikimedia API for nearby historical sites
  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/nearby?lat=${lat}&lng=${lng}&radius=50000&limit=10`;

  fetch(wikiUrl)
    .then((res) => res.json())
    .then((data) => {
      // Filter for likely archaeological/historical sites
      const historicalSites = data.pages
        ? data.pages
            .filter((page) => {
              const title = page.title.toLowerCase();
              const categories = [
                "archaeological",
                "historic",
                "monument",
                "ruins",
                "cemetery",
                "battlefield",
                "fort",
                "pueblo",
                "mound",
                "site",
                "park",
                "museum",
              ];
              return (
                categories.some((cat) => title.includes(cat)) ||
                (page.description &&
                  categories.some((cat) =>
                    page.description.toLowerCase().includes(cat)
                  ))
              );
            })
            .slice(0, 6)
        : [];

      if (historicalSites.length > 0) {
        displayArchaeologicalSites(historicalSites, archEl, "wikipedia");
      } else {
        // Fallback to OpenStreetMap Overpass API for historical features
        loadArchaeologyFromOSM(lat, lng, archEl);
      }
    })
    .catch(() => {
      // If Wikipedia fails, try OpenStreetMap
      loadArchaeologyFromOSM(lat, lng, archEl);
    });
}

function loadArchaeologyFromOSM(lat, lng, archEl) {
  // OpenStreetMap Overpass API query for historical sites
  const overpassQuery = `
          [out:json][timeout:25];
          (
            node["historic"](around:50000,${lat},${lng});
            way["historic"](around:50000,${lat},${lng});
            node["tourism"="museum"](around:25000,${lat},${lng});
            node["amenity"="grave_yard"](around:25000,${lat},${lng});
          );
          out geom;
        `;

  const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
    overpassQuery
  )}`;

  fetch(overpassUrl)
    .then((res) => res.json())
    .then((data) => {
      if (data.elements && data.elements.length > 0) {
        const sites = data.elements
          .slice(0, 6)
          .map((element) => ({
            name:
              element.tags?.name || element.tags?.historic || "Historic Site",
            lat: element.lat || (element.center ? element.center.lat : null),
            lng: element.lon || (element.center ? element.center.lon : null),
            description: getHistoricDescription(element.tags),
            type: element.tags?.historic || element.tags?.tourism || "historic",
          }))
          .filter((site) => site.lat && site.lng);

        displayArchaeologicalSites(sites, archEl, "osm");
      } else {
        // Final fallback to expanded static dataset
        loadArchaeologyFallback(lat, lng, archEl);
      }
    })
    .catch(() => {
      loadArchaeologyFallback(lat, lng, archEl);
    });
}

function getHistoricDescription(tags) {
  if (!tags) return "Historical site";

  const historic = tags.historic;
  const descriptions = {
    archaeological_site: "Archaeological excavation site",
    castle: "Historic castle or fortress",
    church: "Historic church or religious building",
    monument: "Historical monument",
    ruins: "Ancient ruins",
    cemetery: "Historic cemetery",
    battlefield: "Historical battlefield",
    fort: "Military fortification",
    building: "Historic building",
  };

  return (
    descriptions[historic] ||
    tags.description ||
    `Historic ${historic || "site"}`
  );
}

function loadArchaeologyFallback(lat, lng, archEl) {
  // Use the global haversineDistance function

  // Expanded static dataset with more sites across different regions
  const sites = [
    // Southwest USA
    {
      name: "Chaco Canyon",
      lat: 36.0607,
      lng: -107.9609,
      description: "Major ancestral Puebloan cultural center (900-1150 CE)",
    },
    {
      name: "Mesa Verde",
      lat: 37.1853,
      lng: -108.4618,
      description: "Cliff dwellings of ancestral Puebloans (600-1300 CE)",
    },
    {
      name: "Canyon de Chelly",
      lat: 36.1531,
      lng: -109.3368,
      description: "Ancient Puebloan ruins and rock art",
    },
    {
      name: "Bandelier",
      lat: 35.778,
      lng: -106.2708,
      description: "Ancestral Puebloan dwellings and petroglyphs",
    },

    // Midwest USA
    {
      name: "Cahokia Mounds",
      lat: 38.6551,
      lng: -90.0634,
      description: "Mississippian culture ceremonial center (1050-1200 CE)",
    },
    {
      name: "Spiro Mounds",
      lat: 35.2431,
      lng: -94.6199,
      description: "Mississippian culture archaeological site",
    },
    {
      name: "Moundville",
      lat: 32.9976,
      lng: -87.6256,
      description: "Mississippian period mound complex",
    },

    // Southeast USA
    {
      name: "Serpent Mound",
      lat: 39.0203,
      lng: -83.4309,
      description: "Ancient serpent-shaped earthwork (1000 BCE)",
    },
    {
      name: "Poverty Point",
      lat: 32.635,
      lng: -91.4084,
      description: "Archaic period earthworks (1700-1100 BCE)",
    },

    // Northeast USA
    {
      name: "Jamestown",
      lat: 37.2107,
      lng: -76.7758,
      description: "First permanent English settlement (1607)",
    },
    {
      name: "Colonial Williamsburg",
      lat: 37.2707,
      lng: -76.7075,
      description: "Colonial American living history",
    },

    // West Coast
    {
      name: "Cabrillo Monument",
      lat: 32.6722,
      lng: -117.242,
      description: "Spanish exploration site (1542)",
    },
    {
      name: "Mission San Juan Capistrano",
      lat: 33.5017,
      lng: -117.6639,
      description: "Historic Spanish mission (1776)",
    },

    // Alaska
    {
      name: "Sitka National Historical Park",
      lat: 57.0461,
      lng: -135.3126,
      description: "Tlingit fort and Russian colonial site",
    },

    // Hawaii
    {
      name: "Pu'uhonua o Hōnaunau",
      lat: 19.42,
      lng: -155.9106,
      description: "Hawaiian place of refuge and temple",
    },
  ];

  const nearbySites = sites
    .filter((site) => {
      return haversineDistance(lat, lng, site.lat, site.lng) <= 300; // Reduced radius for better results
    })
    .slice(0, 6);

  if (nearbySites.length === 0) {
    const heritageSection = document.getElementById("heritage");
    archEl.innerHTML = `
            <p>🧭 No documented archaeological sites found within 300km.</p>
            <p>This region may have undocumented sites or require specialized archaeological databases.</p>
          `;
    heritageSection.classList.add("has-data");
    mapFeatures.archaeology.found = false;
    mapFeatures.archaeology.count = 0;
    updateMapDescription();
    return;
  }

  displayArchaeologicalSites(nearbySites, archEl, "static");
}

function displayArchaeologicalSites(sites, archEl, source) {
  const heritageSection = document.getElementById("heritage");

  try {
    if (window.geoMap && sites.length > 0) {
      mapFeatures.archaeology.found = true;
      mapFeatures.archaeology.count = sites.length;
      updateMapDescription();

      // Add markers to map using the new archaeology pins
      sites.forEach((site, index) => {
        if (site.lat && site.lng) {
          const popup = `<strong>🏺 ${site.name}</strong><br/>${site.description}`;
          addArchaeologyPin(site.lat, site.lng, popup);
        }
      });

      // Update content area
      const sourceLabel =
        source === "wikipedia"
          ? "from Wikipedia's historical database"
          : source === "osm"
          ? "from OpenStreetMap records"
          : "from historical archives";

      archEl.innerHTML = `
              <p>📍 Found ${
                sites.length
              } historical sites nearby ${sourceLabel}</p>
              <ul class="data-list">
                ${sites
                  .map(
                    (site) => `
                  <li class="archaeology-item">
                    <div>
                      <strong>${site.name}</strong><br/>
                      <small style="color: #ccc;">${site.description}</small>
                    </div>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            `;

      // Show the section now that it has data
      heritageSection.classList.add("has-data");
    } else {
      archEl.innerHTML = `<p>Map not loaded. Cannot display archaeological sites.</p>`;
      heritageSection.classList.add("has-data");
      mapFeatures.archaeology.found = false;
      mapFeatures.archaeology.count = 0;
      updateMapDescription();
    }
  } catch (err) {
    archEl.innerHTML = `<p>Error displaying archaeology data: ${err.message}</p>`;
    heritageSection.classList.add("has-data");
  }
}

function getGeologicContext(age) {
  if (!age || isNaN(age)) return "Unknown time period";
  const ageNum = parseFloat(age);

  if (ageNum > 2500) return "from the Archean — Earth was still cooling";
  if (ageNum > 541) return "from the Precambrian — life was microbial";
  if (ageNum > 250) return "before the dinosaurs";
  if (ageNum > 66) return "during the Age of Dinosaurs";
  if (ageNum > 2.6) return "from the Age of Mammals";
  return "from the Ice Age and beyond";
}

function loadBedrock(lat, lng) {
  const bedrockEl = document.getElementById("bedrock-data");
  fetch(`https://macrostrat.org/api/v2/maps/identify?x=${lng}&y=${lat}`)
    .then((res) => res.json())
    .then((data) => {
      const result =
        data.success && data.data && data.data.units && data.data.units[0];
      if (result) {
        const context = getGeologicContext(result.age);
        const rock = result.lith || result.lith_class || "rock";

        bedrockEl.innerHTML = `
                <h3>${result.strat_name || "Unnamed formation"}</h3>
                <p><strong>Age:</strong> ${result.age || "Unknown"} Ma</p>
                <p><em>Formed ${context}</em></p>
                <p><strong>Rock type:</strong> ${rock}</p>
                <p><small>${result.descr || ""}</small></p>
              `;
      } else {
        bedrockEl.innerHTML = `
                <p>We couldn't find geologic data for that location.</p>
                <p>Try a different ZIP code or enable geolocation.</p>
              `;
      }
    })
    .catch(() => {
      bedrockEl.textContent = "Failed to load geology data.";
    });
}

function loadQuakes(lat, lng) {
  const quakeEl = document.getElementById("quake-data");
  const earthquakesSection = document.getElementById("earthquakes");

  fetch(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=200&orderby=time&limit=3`
  )
    .then((res) => res.json())
    .then((data) => {
      if (!data.features || data.features.length === 0) {
        quakeEl.textContent = "No recent earthquakes nearby.";
        earthquakesSection.classList.add("has-data");
        mapFeatures.earthquakes.found = false;
        mapFeatures.earthquakes.count = 0;
        updateMapDescription();
        return;
      }

      mapFeatures.earthquakes.found = true;
      mapFeatures.earthquakes.count = data.features.length;
      updateMapDescription();

      quakeEl.innerHTML =
        `<p>📍 Found ${data.features.length} earthquakes nearby from USGS monitoring</p>
              <ul class="data-list">` +
        data.features
          .map((f) => {
            const { mag, place, time } = f.properties;
            const date = new Date(time).toLocaleString();
            return `<li class="earthquake-item">
                    <div>
                      <strong>M ${mag} Earthquake</strong><br/>
                      ${place}<br/>
                      <small style="color: #ccc;">${date}</small>
                    </div>
                  </li>`;
          })
          .join("") +
        "</ul>";

      // Show the section now that it has data
      earthquakesSection.classList.add("has-data");

      // Add earthquake markers to the map using addEarthquakePin
      data.features.forEach((f) => {
        const { mag, place, time } = f.properties;
        const [lng, lat] = f.geometry.coordinates;
        const date = new Date(time).toLocaleString();
        const popup = `<strong>🌋 M${mag} Earthquake</strong><br/>${place}<br/><small>${date}</small>`;
        addEarthquakePin(lat, lng, popup);
      });
    })
    .catch(() => {
      quakeEl.textContent = "Failed to load earthquake data.";
      earthquakesSection.classList.add("has-data");
      mapFeatures.earthquakes.found = false;
      mapFeatures.earthquakes.count = 0;
      updateMapDescription();
    });
}

function loadMapTiles(map) {
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
}

function loadWeather(lat, lng) {
  const weatherEl = document.getElementById("weather-data");
  const weatherSection = document.getElementById("weather");
  const url = `https://wttr.in/${lat},${lng}?format=j1`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (!data.current_condition || !data.current_condition[0]) {
        weatherEl.textContent = "No weather data available.";
        weatherSection.classList.add("has-data");
        mapFeatures.weather.found = false;
        currentWeather = null;
        updateMapDescription();
        return;
      }

      mapFeatures.weather.found = true;
      updateMapDescription();

      const current = data.current_condition[0];
      const temp = current.temp_F;
      const desc = current.weatherDesc[0].value;
      const wind = current.windspeedMiles;
      const feelsLike = current.FeelsLikeF;

      // Store weather data globally
      currentWeather = {
        temp: temp,
        description: desc,
        wind: wind,
        feelsLike: feelsLike,
      };

      weatherEl.innerHTML = `
        <p><strong>${desc}</strong> in <em>${userLocationLabel}</em></p>
        <p>🌡️ Temp: ${temp}°F (Feels like ${feelsLike}°F)</p>
        <p>💨 Wind: ${wind} mph</p>
      `;

      // Show the section now that it has data
      weatherSection.classList.add("has-data");

      // Update the existing confirmation message with weather
      updateConfirmationWithWeather();
    })
    .catch(() => {
      weatherEl.textContent = "Failed to load weather.";
      weatherSection.classList.add("has-data");
      mapFeatures.weather.found = false;
      currentWeather = null;
      updateMapDescription();
    });
}
// Shared helper for adding activity pins to the map
function addActivityPin(lat, lng, popupHtml, color = "#cccccc", radius = 5) {
  if (!window.geoMap || !lat || !lng) return;
  L.circleMarker([lat, lng], {
    radius,
    color,
    fillColor: color,
    fillOpacity: 0.7,
  })
    .addTo(activityLayerGroup)
    .bindPopup(popupHtml);
}

// Enhanced pin functions for each category
function addEarthquakePin(lat, lng, popupHtml) {
  if (!window.geoMap || !lat || !lng) return;

  const earthquakeIcon = L.divIcon({
    className: "earthquake-icon",
    html: `<div style="background:#ff4444;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(255,68,68,0.4);">🌋</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  L.marker([lat, lng], { icon: earthquakeIcon })
    .addTo(activityLayerGroup)
    .bindPopup(popupHtml);
}

function addBirdPin(lat, lng, popupHtml) {
  if (!window.geoMap || !lat || !lng) return;

  const birdIcon = L.divIcon({
    className: "bird-icon",
    html: `<div style="background:#4a90e2;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(74,144,226,0.4);">🐦</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  L.marker([lat, lng], { icon: birdIcon })
    .addTo(activityLayerGroup)
    .bindPopup(popupHtml);
}

function addInsectPin(lat, lng, popupHtml) {
  if (!window.geoMap || !lat || !lng) return;

  const insectIcon = L.divIcon({
    className: "insect-icon",
    html: `<div style="background:#9c27b0;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(156,39,176,0.4);">🦋</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  L.marker([lat, lng], { icon: insectIcon })
    .addTo(activityLayerGroup)
    .bindPopup(popupHtml);
}

function addArchaeologyPin(lat, lng, popupHtml) {
  if (!window.geoMap || !lat || !lng) return;

  const archaeologyIcon = L.divIcon({
    className: "archaeology-icon",
    html: `<div style="background:#8b4513;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(139,69,19,0.4);">🏺</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  L.marker([lat, lng], { icon: archaeologyIcon })
    .addTo(activityLayerGroup)
    .bindPopup(popupHtml);
}

function addFossilPin(lat, lng, popupHtml) {
  if (!window.geoMap || !lat || !lng) return;

  const fossilIcon = L.divIcon({
    className: "fossil-icon",
    html: `<div style="background:#8B4513;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(139,69,19,0.4);">🦴</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  L.marker([lat, lng], { icon: fossilIcon })
    .addTo(activityLayerGroup)
    .bindPopup(popupHtml);
}

function addParkPin(lat, lng, popupHtml) {
  if (!window.geoMap || !lat || !lng) return;

  const parkIcon = L.divIcon({
    className: "park-icon",
    html: `<div style="background:#22c55e;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(34,197,94,0.4);">🏞️</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  L.marker([lat, lng], { icon: parkIcon })
    .addTo(activityLayerGroup)
    .bindPopup(popupHtml);
}

// Add a special marker for user location
function addUserLocationPin(lat, lng, label) {
  if (!window.geoMap || !lat || !lng) return;

  // Create a custom icon for user location
  const userIcon = L.divIcon({
    className: "user-location-icon",
    html: `<div style="background:#00ff88;border:3px solid white;border-radius:50%;width:20px;height:20px;box-shadow:0 0 10px rgba(0,255,136,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  L.marker([lat, lng], { icon: userIcon })
    .addTo(activityLayerGroup)
    .bindPopup(`<strong>📍 You are here</strong><br/>${label}`)
    .openPopup();
}

// Recent Searches Functionality
class RecentSearches {
  constructor() {
    this.maxSearches = 10;
    this.storageKey = "naturenear-recent-searches";
    console.log("🕒 Initializing RecentSearches...");

    // Ensure the section is hidden initially
    const section = document.getElementById("recent-searches");
    if (section) {
      section.style.display = "none";
      console.log("🕒 Section explicitly hidden on init");
    }

    // Check if we have existing searches and show them
    this.checkAndDisplayExistingSearches();
  }

  checkAndDisplayExistingSearches() {
    const existingSearches = this.getPersonalSearches();
    console.log("🕒 Found existing searches:", existingSearches.length);

    if (existingSearches.length > 0) {
      setTimeout(() => {
        this.displayPersonalSearches();
      }, 500); // Small delay to ensure DOM is ready
    }

    // Always load community searches after a short delay
    setTimeout(() => {
      this.displayCommunitySearches();
    }, 1000);

    // Debug: Log all community data
    setTimeout(() => {
      this.debugCommunityData();
    }, 2000);
  }

  // Debug function to see all community data
  debugCommunityData() {
    try {
      const allCommunityData = JSON.parse(
        localStorage.getItem("community-searches") || "[]"
      );
      console.log("🔍 DEBUG: ALL COMMUNITY DATA (including your own):");
      console.log(
        "🔍 Total searches in community-searches:",
        allCommunityData.length
      );
      allCommunityData.forEach((search, index) => {
        console.log(
          `🔍 ${index + 1}. ${search.displayName} (sessionId: ${
            search.sessionId
          }, timestamp: ${search.timestamp})`
        );
      });

      const currentSessionId = this.getSessionId();
      const yourSearches = allCommunityData.filter(
        (s) => s.sessionId === currentSessionId
      );
      const otherSearches = allCommunityData.filter(
        (s) => s.sessionId !== currentSessionId
      );

      console.log(
        `🔍 Your searches (${currentSessionId}):`,
        yourSearches.length
      );
      console.log(`🔍 Other users' searches:`, otherSearches.length);

      // Make this available globally for manual debugging
      window.debugCommunityData = allCommunityData;
      window.currentSessionId = currentSessionId;
    } catch (error) {
      console.error("🔍 Debug error:", error);
    }
  }

  // Debug method to show ALL community data (including user's own)
  showAllCommunityData() {
    try {
      const allCommunityData = JSON.parse(
        localStorage.getItem("community-searches") || "[]"
      );
      const container = document.getElementById("community-searches");
      const currentSessionId = this.getSessionId();

      if (allCommunityData.length === 0) {
        container.innerHTML = "<p>🔍 DEBUG: No community data found</p>";
        return;
      }

      let html =
        '<div style="background: #333; padding: 10px; border-radius: 5px; margin-bottom: 10px;"><strong>🔍 DEBUG: All Community Data (including your own)</strong></div>';

      allCommunityData.forEach((search, index) => {
        const isYours = search.sessionId === currentSessionId;
        const ago = this.getTimeAgo(search.timestamp);
        html += `
                <div class="search-item" style="background: ${
                  isYours ? "#004400" : "#000044"
                }; margin: 5px 0; padding: 8px; border-radius: 4px;">
                  <strong>${search.displayName}</strong>
                  <div style="font-size: 0.8em; opacity: 0.8;">
                    ${ago} ${isYours ? "(YOUR SEARCH)" : "(OTHER USER)"}
                    <br>Session: ${search.sessionId}
                  </div>
                </div>
              `;
      });

      html += `<button onclick="window.recentSearches.displayCommunitySearches()" style="margin-top: 10px; padding: 5px 10px; background: #666; color: #fff; border: none; border-radius: 4px; cursor: pointer;">🔄 Return to Normal View</button>`;

      container.innerHTML = html;
    } catch (error) {
      console.error("🔍 Error showing all community data:", error);
    }
  }

  // Save to recent searches and community
  addSearch(city, state, country) {
    console.log(`🕒 addSearch called with:`, { city, state, country });

    if (!city || !state) {
      console.log("🕒 addSearch FAILED - missing city or state");
      return;
    }

    const searchData = {
      city: city,
      state: state,
      country: country,
      timestamp: new Date().toISOString(),
      displayName: this.formatLocationName(city, state, country),
    };

    console.log(`🕒 Creating search data:`, searchData);

    let searches = this.getPersonalSearches();
    console.log(`🕒 Current searches before adding:`, searches);

    // Remove duplicate if exists (same city/state/country)
    searches = searches.filter(
      (search) =>
        !(
          search.city === city &&
          search.state === state &&
          search.country === country
        )
    );

    // Add new search to beginning
    searches.unshift(searchData);

    // Keep only the most recent searches
    searches = searches.slice(0, this.maxSearches);

    console.log(`🕒 Searches after processing:`, searches);

    // Save to localStorage
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(searches));
      console.log(`🕒 Successfully saved to localStorage`);
    } catch (error) {
      console.error("🕒 Error saving to localStorage:", error);
    }

    // Also save to community (anonymous)
    this.saveToCommunity(searchData);

    // Update the UI
    this.displayPersonalSearches();

    console.log(`🕒 Added to recent searches: ${searchData.displayName}`);
    console.log(`🕒 Total searches now: ${searches.length}`);
  }

  // Save search to community database
  async saveToCommunity(searchData) {
    try {
      console.log("🌍 Saving to community:", searchData);

      // For now, use localStorage to simulate community (in production this would be a real backend)
      // This creates a "shared" experience within each browser session
      const communityData = {
        city: searchData.city,
        state: searchData.state,
        country: searchData.country,
        timestamp: searchData.timestamp,
        displayName: searchData.displayName,
        sessionId: this.getSessionId(),
      };

      const existingCommunity = JSON.parse(
        localStorage.getItem("community-searches") || "[]"
      );
      console.log(
        "🌍 Existing community before save:",
        existingCommunity.length,
        "searches"
      );

      const updatedCommunity = [communityData, ...existingCommunity].slice(
        0,
        20
      );
      localStorage.setItem(
        "community-searches",
        JSON.stringify(updatedCommunity)
      );

      console.log("🌍 Successfully saved to community storage");
      console.log(
        "🌍 Updated community now has:",
        updatedCommunity.length,
        "searches"
      );

      // Refresh community display
      setTimeout(() => this.displayCommunitySearches(), 1000);
    } catch (error) {
      console.warn("🌍 Failed to save to community:", error);
    }
  }

  // Get anonymous session ID for community tracking
  getSessionId() {
    let sessionId = sessionStorage.getItem("nature-session-id");
    if (!sessionId) {
      sessionId =
        "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
      sessionStorage.setItem("nature-session-id", sessionId);
    }
    return sessionId;
  }

  // Get searches from localStorage
  getPersonalSearches() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      console.log("🕒 Raw localStorage data:", stored);
      const parsed = stored ? JSON.parse(stored) : [];
      console.log("🕒 Parsed localStorage data:", parsed);
      return parsed;
    } catch (error) {
      console.warn("Error loading recent searches:", error);
      return [];
    }
  }

  // Format location name for display
  formatLocationName(city, state, country) {
    if (state && country === "United States") {
      return `${city}, ${state}`;
    } else if (state && country) {
      return `${city}, ${state}, ${country}`;
    } else if (country) {
      return `${city}, ${country}`;
    } else {
      return city;
    }
  }

  // Format time for display
  formatTime(timestamp) {
    const now = new Date();
    const searchTime = new Date(timestamp);
    const diffInHours = (now - searchTime) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  }

  // Display personal searches in the UI
  displayPersonalSearches() {
    const container = document.getElementById("personal-searches");
    const section = document.getElementById("recent-searches");

    console.log("🕒 displayPersonalSearches called");
    console.log("🕒 Container element:", !!container);
    console.log("🕒 Section element:", !!section);

    if (!container || !section) {
      console.error(
        "🕒 Missing DOM elements - container:",
        !!container,
        "section:",
        !!section
      );
      return;
    }

    const searches = this.getPersonalSearches();
    console.log("🕒 Displaying searches count:", searches.length);

    if (searches.length === 0) {
      container.innerHTML = '<p class="no-searches">No recent searches yet</p>';
      // Explicitly hide the section
      section.style.display = "none";
      section.classList.remove("has-data");
      console.log("🕒 No searches - hiding section with style.display = none");
      return;
    }

    // Explicitly show the section when we have searches
    section.style.display = "block";
    section.classList.add("has-data");
    console.log(
      "🕒 Found searches - showing section with style.display = block"
    );

    let html = "";
    searches.forEach((search) => {
      html += `
              <div class="search-item" onclick="window.recentSearches.selectSearch('${search.city}', '${search.state}', '${search.country}')">
                <span class="search-location">${search.displayName}</span>
              </div>
            `;
    });

    html +=
      '<button class="clear-searches" onclick="window.recentSearches.clearPersonalSearches()">Clear Recent</button>';

    container.innerHTML = html;
  }

  // Handle clicking on a recent search
  selectSearch(city, state, country) {
    const locationName = this.formatLocationName(city, state, country);
    console.log(`🕒 Selected recent search: ${locationName}`);

    // Update the input field
    const input = document.getElementById("location-input-field");
    if (input) {
      input.value = locationName;
    }

    // Trigger the search using the existing function
    searchAndUseLocation(locationName);
  }

  // Clear all personal searches
  clearPersonalSearches() {
    if (confirm("Clear all your recent searches?")) {
      localStorage.removeItem(this.storageKey);
      this.displayPersonalSearches();
      console.log("🕒 Cleared recent searches");
    }
  }

  // Debug function to test the widget
  testWidget() {
    console.log("🕒 Testing widget...");
    const section = document.getElementById("recent-searches");
    console.log(
      "🕒 Section display:",
      section ? window.getComputedStyle(section).display : "not found"
    );
    console.log(
      "🕒 Section classList:",
      section ? Array.from(section.classList) : "not found"
    );
    console.log("🕒 LocalStorage:", localStorage.getItem(this.storageKey));
  }

  // Load and display searches when needed
  loadPersonalSearches() {
    console.log("🕒 Loading personal searches...");
    const existingSearches = this.getPersonalSearches();
    console.log("🕒 Found existing searches:", existingSearches.length);
    this.displayPersonalSearches();

    // Extra debugging - check the final state
    const section = document.getElementById("recent-searches");
    if (section) {
      console.log(
        "🕒 Final state - has-data class:",
        section.classList.contains("has-data")
      );
      console.log(
        "🕒 Final state - computed display:",
        window.getComputedStyle(section).display
      );
    }
  }

  // Real Community searches from YOUR site users
  displayCommunitySearches() {
    const container = document.getElementById("community-searches");
    const communitySection = document.getElementById(
      "community-recent-searches"
    );

    console.log("🌍 Loading curated community inspirations...");

    // Show curated locations that have great nature data
    const curatedLocations = [
      {
        city: "Boulder",
        state: "Colorado",
        country: "United States",
        activity: "mountain exploring",
        ago: "2h",
        description: "🏔️ Amazing bird watching, fossils, and mountain views",
      },
      {
        city: "Asheville",
        state: "North Carolina",
        country: "United States",
        activity: "wildlife spotting",
        ago: "4h",
        description: "🌲 Rich biodiversity and beautiful hiking trails",
      },
      {
        city: "Moab",
        state: "Utah",
        country: "United States",
        activity: "red rock exploring",
        ago: "6h",
        description: "🏜️ Incredible geological formations and archaeology",
      },
    ];

    // Always show the curated locations
    communitySection.style.display = "block";
    this.renderCommunitySearches(curatedLocations, container);
  }

  parseLocationFromPlace(placeGuess) {
    // Parse location from iNaturalist place_guess format
    // Examples: "San Francisco, CA, US", "Denver, Colorado, US", "Yellowstone National Park, WY, US"

    const parts = placeGuess.split(",").map((p) => p.trim());
    let city = "",
      state = "";

    if (parts.length >= 2) {
      city = parts[0];

      // Look for state in second or third part
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        // Check if it's a US state (2-letter code or full name)
        if (this.isUSState(part)) {
          state = this.normalizeState(part);
          break;
        }
      }
    }

    return { city, state };
  }

  isUSState(text) {
    const states = [
      "AL",
      "AK",
      "AZ",
      "AR",
      "CA",
      "CO",
      "CT",
      "DE",
      "FL",
      "GA",
      "HI",
      "ID",
      "IL",
      "IN",
      "IA",
      "KS",
      "KY",
      "LA",
      "ME",
      "MD",
      "MA",
      "MI",
      "MN",
      "MS",
      "MO",
      "MT",
      "NE",
      "NV",
      "NH",
      "NJ",
      "NM",
      "NY",
      "NC",
      "ND",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VT",
      "VA",
      "WA",
      "WV",
      "WI",
      "WY",
      "Alabama",
      "Alaska",
      "Arizona",
      "Arkansas",
      "California",
      "Colorado",
      "Connecticut",
      "Delaware",
      "Florida",
      "Georgia",
      "Hawaii",
      "Idaho",
      "Illinois",
      "Indiana",
      "Iowa",
      "Kansas",
      "Kentucky",
      "Louisiana",
      "Maine",
      "Maryland",
      "Massachusetts",
      "Michigan",
      "Minnesota",
      "Mississippi",
      "Missouri",
      "Montana",
      "Nebraska",
      "Nevada",
      "New Hampshire",
      "New Jersey",
      "New Mexico",
      "New York",
      "North Carolina",
      "North Dakota",
      "Ohio",
      "Oklahoma",
      "Oregon",
      "Pennsylvania",
      "Rhode Island",
      "South Carolina",
      "South Dakota",
      "Tennessee",
      "Texas",
      "Utah",
      "Vermont",
      "Virginia",
      "Washington",
      "West Virginia",
      "Wisconsin",
      "Wyoming",
    ];

    return states.includes(text);
  }

  normalizeState(state) {
    const stateMap = {
      Alabama: "AL",
      Alaska: "AK",
      Arizona: "AZ",
      Arkansas: "AR",
      California: "CA",
      Colorado: "CO",
      Connecticut: "CT",
      Delaware: "DE",
      Florida: "FL",
      Georgia: "GA",
      Hawaii: "HI",
      Idaho: "ID",
      Illinois: "IL",
      Indiana: "IN",
      Iowa: "IA",
      Kansas: "KS",
      Kentucky: "KY",
      Louisiana: "LA",
      Maine: "ME",
      Maryland: "MD",
      Massachusetts: "MA",
      Michigan: "MI",
      Minnesota: "MN",
      Mississippi: "MS",
      Missouri: "MO",
      Montana: "MT",
      Nebraska: "NE",
      Nevada: "NV",
      "New Hampshire": "NH",
      "New Jersey": "NJ",
      "New Mexico": "NM",
      "New York": "NY",
      "North Carolina": "NC",
      "North Dakota": "ND",
      Ohio: "OH",
      Oklahoma: "OK",
      Oregon: "OR",
      Pennsylvania: "PA",
      "Rhode Island": "RI",
      "South Carolina": "SC",
      "South Dakota": "SD",
      Tennessee: "TN",
      Texas: "TX",
      Utah: "UT",
      Vermont: "VT",
      Virginia: "VA",
      Washington: "WA",
      "West Virginia": "WV",
      Wisconsin: "WI",
      Wyoming: "WY",
    };

    return stateMap[state] || state;
  }

  getActivityFromObservation(obs) {
    const taxonName = obs.taxon?.name?.toLowerCase() || "";
    const commonName = obs.taxon?.preferred_common_name?.toLowerCase() || "";

    // Generate activity based on what was observed
    if (taxonName.includes("bird") || commonName.includes("bird")) {
      return "bird watching";
    } else if (
      taxonName.includes("butterfly") ||
      taxonName.includes("moth") ||
      commonName.includes("butterfly")
    ) {
      return "butterfly spotting";
    } else if (
      taxonName.includes("flower") ||
      taxonName.includes("plant") ||
      commonName.includes("flower")
    ) {
      return "wildflower hunting";
    } else if (taxonName.includes("tree") || commonName.includes("tree")) {
      return "tree identification";
    } else if (
      taxonName.includes("mammal") ||
      commonName.includes("deer") ||
      commonName.includes("bear")
    ) {
      return "wildlife tracking";
    } else if (
      taxonName.includes("insect") ||
      commonName.includes("bee") ||
      commonName.includes("beetle")
    ) {
      return "insect observation";
    } else if (taxonName.includes("spider") || commonName.includes("spider")) {
      return "arachnid spotting";
    } else if (taxonName.includes("fish") || commonName.includes("fish")) {
      return "aquatic life viewing";
    } else if (
      taxonName.includes("fungi") ||
      taxonName.includes("mushroom") ||
      commonName.includes("mushroom")
    ) {
      return "mushroom foraging";
    } else {
      return "nature exploring";
    }
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const obsTime = new Date(timestamp);
    const diffInHours = (now - obsTime) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return "1d";
      if (diffInDays < 7) return `${diffInDays}d`;
      const diffInWeeks = Math.floor(diffInDays / 7);
      return `${diffInWeeks}w`;
    }
  }

  generateCommunitySearches() {
    const interestingLocations = [
      {
        city: "Yellowstone",
        state: "Wyoming",
        country: "United States",
        activity: "geyser watching",
        ago: "2h",
      },
      {
        city: "Yosemite Valley",
        state: "California",
        country: "United States",
        activity: "waterfall hiking",
        ago: "4h",
      },
      {
        city: "Grand Canyon",
        state: "Arizona",
        country: "United States",
        activity: "sunrise viewing",
        ago: "6h",
      },
      {
        city: "Zion",
        state: "Utah",
        country: "United States",
        activity: "slot canyon exploring",
        ago: "8h",
      },
      {
        city: "Glacier",
        state: "Montana",
        country: "United States",
        activity: "wildlife spotting",
        ago: "12h",
      },
      {
        city: "Acadia",
        state: "Maine",
        country: "United States",
        activity: "coastal tide pooling",
        ago: "1d",
      },
      {
        city: "Olympic",
        state: "Washington",
        country: "United States",
        activity: "rainforest walking",
        ago: "1d",
      },
      {
        city: "Great Smoky Mountains",
        state: "Tennessee",
        country: "United States",
        activity: "wildflower viewing",
        ago: "2d",
      },

      {
        city: "Everglades",
        state: "Florida",
        country: "United States",
        activity: "bird watching",
        ago: "3d",
      },
      {
        city: "Crater Lake",
        state: "Oregon",
        country: "United States",
        activity: "volcanic lake viewing",
        ago: "3d",
      },
      {
        city: "Bryce Canyon",
        state: "Utah",
        country: "United States",
        activity: "hoodoo formations",
        ago: "4d",
      },
      {
        city: "Sequoia",
        state: "California",
        country: "United States",
        activity: "giant tree viewing",
        ago: "5d",
      },
      {
        city: "Rocky Mountain",
        state: "Colorado",
        country: "United States",
        activity: "alpine hiking",
        ago: "5d",
      },
      {
        city: "Badlands",
        state: "South Dakota",
        country: "United States",
        activity: "fossil hunting",
        ago: "1w",
      },
      {
        city: "Joshua Tree",
        state: "California",
        country: "United States",
        activity: "desert exploring",
        ago: "1w",
      },
      {
        city: "Denali",
        state: "Alaska",
        country: "United States",
        activity: "mountain viewing",
        ago: "2w",
      },
      {
        city: "Haleakala",
        state: "Hawaii",
        country: "United States",
        activity: "volcano sunrise",
        ago: "2w",
      },
    ];

    // Shuffle and take 5-7 random locations
    const shuffled = interestingLocations.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.floor(Math.random() * 3) + 5); // 5-7 results
  }

  renderCommunitySearches(searches, container) {
    let html = `<p class="community-intro">Recent explorations by Nature Near Me users:</p>`;

    searches.forEach((search) => {
      const displayName =
        search.country === "United States"
          ? `${search.city}, ${search.state}`
          : `${search.city}, ${search.state}, ${search.country}`;

      html += `
              <div class="search-item community-item" onclick="window.recentSearches.selectSearch('${search.city}', '${search.state}', '${search.country}')">
                <span class="search-location">${displayName}</span>
                <span class="search-activity">${search.activity}</span>
              </div>
            `;
    });

    html +=
      '<p class="community-note"><small>🌲 Join fellow explorers discovering nature across America!</small></p>';

    container.innerHTML = html;
  }
}
