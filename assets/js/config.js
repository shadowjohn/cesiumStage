(function (root) {
  "use strict";

  var cesiumBaseUrl = "https://3dmap.focusit.com.tw/easymap_data/Cesium-1.120/build/Cesium/";

  root.CESIUM_BASE_URL = cesiumBaseUrl;
  root.CESIUM_STAGE_CONFIG = {
    cesiumBaseUrl: cesiumBaseUrl,
    appName: "cesiumStage",
    imagery: {
      url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      rawTemplateUrl: "https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png",
      credit: "OpenStreetMap contributors, CARTO",
      maximumLevel: 19,
      useLiveTiles: true,
    },
    localBasemap: {
      url: "assets/images/dark-osm-basemap.png",
      sourceUrl: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      west: 120.56396484375,
      south: 24.026396666017327,
      east: 120.76171875,
      north: 24.16680208530323,
    },
    camera: {
      longitude: 120.665,
      latitude: 24.097,
      height: 72000,
      range: 36000,
      heading: 0,
      pitch: -89,
      roll: 0,
      bounds: {
        west: 120.58,
        south: 24.045,
        east: 120.74,
        north: 24.15,
      },
    },
    water: {
      min: 0,
      max: 5,
      step: 0.1,
      initial: 1.6,
      baseHeight: 78,
      safetyBuffer: 0.8,
      normalMap: cesiumBaseUrl + "Assets/Textures/waterNormals.jpg",
      autoRiseIntervalMs: 90,
      autoRiseStep: 0.08,
    },
    terrain: {
      mode: "ellipsoid",
      exampleUrl: "https://www.focusit.com.tw/easymap/easymap_cesium_terrain.html",
      exampleProvider: "Cesium.Terrain.fromWorldTerrain({ requestWaterMask: true })",
      demHeightApi: "https://3wa.tw/demo/php/map/taiwan_dem_height/api.php?mode=getDemHeight",
      demProjection: "EPSG:3826",
      notes: "FocusIT 範例使用 Cesium World Terrain；正式 DEM 可由 20M 高程轉 quantized-mesh 或以批次 API 預取。",
    },
    debris: {
      maxAreaAlpha: 0.28,
      streamWidth: 3,
      particleSpeed: 0.16,
    },
    buildings: {
      enabled: true,
      identityUrlTemplate: "https://3wa.tw/easymap_server/identity.php?mode=identity&wms_id=8&lon={lon}&lat={lat}&limit={limit}",
      sourceLabel: "臺中市建物圖(113年最新版)",
      maxFeatures: 1800,
      baseHeight: 78,
      floorHeight: 3.5,
      floodHighlightLevel: 2.5,
      defaultAlpha: 0.62,
      maxFloodCollars: 90,
      colors: {
        low: "#b8f7ff",
        mid: "#f4a340",
        high: "#ff5f56",
        flooded: "#3aa0ff",
        outline: "#061018",
      },
    },
  };
})(window);
