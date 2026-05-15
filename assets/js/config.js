(function (root) {
  "use strict";

  var cesiumBaseUrl = "https://3dmap.focusit.com.tw/easymap_data/Cesium-1.120/build/Cesium/";

  root.CESIUM_BASE_URL = cesiumBaseUrl;
  root.CESIUM_STAGE_CONFIG = {
    cesiumBaseUrl: cesiumBaseUrl,
    appName: "cesiumStage",
    imagery: {
      url: "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}",
      credit: "內政部國土測繪中心",
      maximumLevel: 19,
    },
    localBasemap: {
      url: "assets/images/demo-basemap.png",
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
    },
    debris: {
      maxAreaAlpha: 0.28,
      streamWidth: 3,
    },
  };
})(window);
