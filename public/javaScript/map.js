var mapboxClient = mapboxSdk({
  accessToken:
    "sk.eyJ1IjoicGRhbzIwMTUiLCJhIjoiY2s4bnR3Z2kyMTI5MzNzbndxenhtY3N5aiJ9.l1U8MpyfW3xcWn3dpXiMIQ",
});

var stores = " ";

mapboxClient.datasets
  .listFeatures({
    datasetId: "ck8mlu0qy1q1a2rl4as2qrw0x",
  })
  .send()
  .then(
    (response) => {
      stores = response.body;
      //console.log(stores);
      stores.features.forEach(function (store, i) {
        store.properties.id = i;
      });
    },
    (error) => {
      if (err.type === "RequestAbortedError") {
        return;
      }
      console.error(error.message);
    }
  );

console.log(stores);
/* This will let you use the .remove() function later on */
if (!("remove" in Element.prototype)) {
  Element.prototype.remove = function () {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  };
}

mapboxgl.accessToken =
  "pk.eyJ1IjoicGRhbzIwMTUiLCJhIjoiY2p5ZDlqNnI4MG84NDNjcW14bzAwbXVpbSJ9.-GnGL_1vL8oZm_XHI9jSqw";

//For geotracking on map load
var geoTracker = new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true,
  },
  trackUserLocation: true,
});
/**
 * Add the map to the page
 */
var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v11",
  center: [-77.034084142948, 38.909671288923],
  zoom: 13,
  scrollZoom: false,
});

map.addControl(geoTracker, "bottom-right");
/**
 * Assign a unique id to each store. You'll use this `id`
 * later to associate each point on the map with a listing
 * in the sidebar.
 */

/**
 * Wait until the map loads to make changes to the map.
 */
map.on("load", function (e) {
  /**
   * This is where your '.addLayer()' used to be, instead
   * add only the source without styling a layer
   *
   */
  //console.log(`On page load  ${stores}`);
  console.log(stores);
  map.addSource("places", {
    type: "geojson",
    data: stores,
  });

  //trigger and start tracking
  geoTracker.trigger();

  /**
   * Create a new MapboxGeocoder instance.
   */
  var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: true,
    bbox: [-77.210763, 38.803367, -76.853675, 39.052643],
  });

  /**
   * Add all the things to the page:
   * - The location listings on the side of the page
   * - The search box (MapboxGeocoder) onto the map
   * - The markers onto the map
   */
  buildLocationList(stores);
  map.addControl(geocoder, "bottom-left");
  addMarkers();

  /**
   * Listen for when a geocoder result is returned. When one is returned:
   * - Calculate distances
   * - Sort stores by distance
   * - Rebuild the listings
   * - Adjust the map camera
   * - Open a popup for the closest store
   * - Highlight the listing for the closest store.
   */
  geoTracker.on("geolocate", onLocated);
  geocoder.on("result", onLocated);
  function onLocated(ev) {
    /* Get the coordinate of the search result */
    console.log(`Fired on: ${ev}`);
    if (ev.type == "geolocate") {
      var searchResult = {
        coordinates: [ev.coords.longitude, ev.coords.latitude],
        type: "Point",
      };
    } else {
      var searchResult = ev.result.geometry;
      console.log(ev.result.geometry);
    }

    /**
     * Calculate distances:
     * For each store, use turf.disance to calculate the distance
     * in miles between the searchResult and the store. Assign the
     * calculated value to a property called `distance`.
     */
    var options = { units: "miles" };
    stores.features.forEach(function (store) {
      Object.defineProperty(store.properties, "distance", {
        value: turf.distance(searchResult, store.geometry, options),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    });

    /**
     * Sort stores by distance from closest to the `searchResult`
     * to furthest.
     */
    stores.features.sort(function (a, b) {
      if (a.properties.distance > b.properties.distance) {
        return 1;
      }
      if (a.properties.distance < b.properties.distance) {
        return -1;
      }
      return 0; // a must be equal to b
    });

    /**
     * Rebuild the listings:
     * Remove the existing listings and build the location
     * list again using the newly sorted stores.
     */
    var listings = document.getElementById("listings");
    while (listings.firstChild) {
      listings.removeChild(listings.firstChild);
    }
    buildLocationList(stores);

    /* Open a popup for the closest store. */
    createPopUp(stores.features[0]);

    /** Highlight the listing for the closest store. */
    var activeListing = document.getElementById(
      "listing-" + stores.features[0].properties.id
    );
    activeListing.classList.add("active");

    /**
     * Adjust the map camera:
     * Get a bbox that contains both the geocoder result and
     * the closest store. Fit the bounds to that bbox.
     */
    var bbox = getBbox(stores, 0, searchResult);
    map.fitBounds(bbox, {
      padding: 100,
    });
  }
});

/**
 * Using the coordinates (lng, lat) for
 * (1) the search result and
 * (2) the closest store
 * construct a bbox that will contain both points
 */
function getBbox(sortedStores, storeIdentifier, searchResult) {
  var lats = [
    sortedStores.features[storeIdentifier].geometry.coordinates[1],
    searchResult.coordinates[1],
  ];
  var lons = [
    sortedStores.features[storeIdentifier].geometry.coordinates[0],
    searchResult.coordinates[0],
  ];
  var sortedLons = lons.sort(function (a, b) {
    if (a > b) {
      return 1;
    }
    if (a.distance < b.distance) {
      return -1;
    }
    return 0;
  });
  var sortedLats = lats.sort(function (a, b) {
    if (a > b) {
      return 1;
    }
    if (a.distance < b.distance) {
      return -1;
    }
    return 0;
  });
  return [
    [sortedLons[0], sortedLats[0]],
    [sortedLons[1], sortedLats[1]],
  ];
}

/**
 * Add a marker to the map for every store listing.
 **/
function addMarkers() {
  /* For each feature in the GeoJSON object above: */
  stores.features.forEach(function (marker) {
    /* Create a div element for the marker. */
    var el = document.createElement("div");
    /* Assign a unique `id` to the marker. */
    el.id = "marker-" + marker.properties.id;
    /* Assign the `marker` class to each marker for styling. */
    el.className = "marker";

    /**
     * Create a marker using the div element
     * defined above and add it to the map.
     **/
    new mapboxgl.Marker(el, { offset: [0, -23] })
      .setLngLat(marker.geometry.coordinates)
      .addTo(map);

    /**
     * Listen to the element and when it is clicked, do three things:
     * 1. Fly to the point
     * 2. Close all other popups and display popup for clicked store
     * 3. Highlight listing in sidebar (and remove highlight for all other listings)
     **/
    el.addEventListener("click", function (e) {
      flyToStore(marker);
      createPopUp(marker);
      var activeItem = document.getElementsByClassName("active");
      e.stopPropagation();
      if (activeItem[0]) {
        activeItem[0].classList.remove("active");
      }
      var listing = document.getElementById("listing-" + marker.properties.id);
      listing.classList.add("active");
    });
  });
}

/**
 * Add a listing for each store to the sidebar.
 **/
function buildLocationList(data) {
  data.features.forEach(function (store, i) {
    /**
     * Create a shortcut for `store.properties`,
     * which will be used several times below.
     **/
    var prop = store.properties;

    /* Add a new listing section to the sidebar. */
    var listings = document.getElementById("listings");
    var listing = listings.appendChild(document.createElement("div"));
    /* Assign a unique `id` to the listing. */
    listing.id = "listing-" + prop.id;
    /* Assign the `item` class to each listing for styling. */
    listing.className = "item";

    /* Add the link to the individual listing created above. */
    var link = listing.appendChild(document.createElement("a"));
    link.href = "#";
    link.className = "title";
    link.id = "link-" + prop.id;
    link.innerHTML = prop.firstname;

    /* Add details to the individual listing. */
    var details = listing.appendChild(document.createElement("div"));
    details.innerHTML = prop.city;
    if (prop.phone) {
      details.innerHTML += " · " + prop.phoneFormatted;
    }
    if (prop.distance) {
      var roundedDistance = Math.round(prop.distance * 100) / 100;
      details.innerHTML +=
        "<p><strong>" + roundedDistance + " miles away</strong></p>";
    }

    /**
     * Listen to the element and when it is clicked, do four things:
     * 1. Update the `currentFeature` to the store associated with the clicked link
     * 2. Fly to the point
     * 3. Close all other popups and display popup for clicked store
     * 4. Highlight listing in sidebar (and remove highlight for all other listings)
     **/
    link.addEventListener("click", function (e) {
      for (var i = 0; i < data.features.length; i++) {
        if (this.id === "link-" + data.features[i].properties.id) {
          var clickedListing = data.features[i];
          flyToStore(clickedListing);
          createPopUp(clickedListing);
        }
      }
      var activeItem = document.getElementsByClassName("active");
      if (activeItem[0]) {
        activeItem[0].classList.remove("active");
      }
      this.parentNode.classList.add("active");
    });
  });
}

/**
 * Use Mapbox GL JS's `flyTo` to move the camera smoothly
 * a given center point.
 **/
function flyToStore(currentFeature) {
  map.flyTo({
    center: currentFeature.geometry.coordinates,
    zoom: 15,
  });
}

/**
 * Create a Mapbox GL JS `Popup`.
 **/
function createPopUp(currentFeature) {
  var popUps = document.getElementsByClassName("mapboxgl-popup");
  if (popUps[0]) popUps[0].remove();

  if (currentFeature.properties.distance) {
    var roundedDistance =
      Math.round(currentFeature.properties.distance * 100) / 100;
  }
  var popup = new mapboxgl.Popup({ closeOnClick: false })
    .setLngLat(currentFeature.geometry.coordinates)
    .setHTML(
      "<h3>Donor</h3>" +
        "<h4>" +
        currentFeature.properties.firstname +
        "</h4>" +
        "<h4>" +
        roundedDistance +
        " miles away </h4>"
    )
    .addTo(map);
}
