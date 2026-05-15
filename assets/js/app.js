(function (root) {
  "use strict";

  var Cesium = root.Cesium;
  var config = root.CESIUM_STAGE_CONFIG;
  var sampleData = root.CESIUM_STAGE_SAMPLE_DATA;
  var model = root.CESIUM_STAGE_MODEL;
  var viewer = null;
  var floodPrimitives = [];
  var localBasemapPrimitive = null;
  var cctvEntities = {};
  var roadEntities = [];
  var debrisAreaSource = null;
  var debrisStreamSource = null;

  var dom = {
    waterLevel: document.getElementById("waterLevel"),
    waterLevelValue: document.getElementById("waterLevelValue"),
    floodBandCount: document.getElementById("floodBandCount"),
    affectedCctvCount: document.getElementById("affectedCctvCount"),
    roadBreakCount: document.getElementById("roadBreakCount"),
    statusText: document.getElementById("statusText"),
    toggleFlood: document.getElementById("toggleFlood"),
    toggleCctv: document.getElementById("toggleCctv"),
    toggleDebrisArea: document.getElementById("toggleDebrisArea"),
    toggleDebrisStream: document.getElementById("toggleDebrisStream"),
  };

  function setStatus(message, type) {
    dom.statusText.textContent = message;
    dom.statusText.className = "status" + (type ? " is-" + type : "");
  }

  function toRadians(value) {
    return Cesium.Math.toRadians(Number(value) || 0);
  }

  function getWaterLevel() {
    return model.clampWaterLevel(dom.waterLevel.value, config.water);
  }

  function createWaterMaterial(band) {
    var color = Cesium.Color.fromCssColorString(band.color || "#287bd9").withAlpha(0.56);

    return Cesium.Material.fromType(Cesium.Material.WaterType, {
      baseWaterColor: color,
      blendColor: color.withAlpha(0.42),
      normalMap: config.water.normalMap,
      frequency: 850,
      animationSpeed: 0.018,
      amplitude: 5.0,
      specularIntensity: 0.9,
    });
  }

  function clearFloodPrimitives() {
    floodPrimitives.forEach(function (primitive) {
      viewer.scene.primitives.remove(primitive);
    });
    floodPrimitives = [];
  }

  function createFloodPrimitive(band, waterLevel, index) {
    var height = config.water.baseHeight + waterLevel + index * 0.12;
    var positions = band.coordinates.map(function (xy) {
      return Cesium.Cartesian3.fromDegrees(xy[0], xy[1], height);
    });

    return viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(positions),
          perPositionHeight: true,
          vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        }),
        id: band.id,
      }),
      appearance: new Cesium.EllipsoidSurfaceAppearance({
        aboveGround: true,
        material: createWaterMaterial(band),
      }),
      asynchronous: false,
    }));
  }

  function renderFlood(waterLevel) {
    clearFloodPrimitives();

    if (!dom.toggleFlood.checked) {
      dom.floodBandCount.textContent = "0";
      return;
    }

    var visibleBands = model.getVisibleFloodBands(sampleData.floodBands, waterLevel);
    visibleBands.forEach(function (band, index) {
      floodPrimitives.push(createFloodPrimitive(band, waterLevel, index));
    });

    dom.floodBandCount.textContent = String(visibleBands.length);
  }

  function addCctvEntities() {
    sampleData.cctv.forEach(function (camera) {
      var entity = viewer.entities.add({
        id: camera.id,
        name: camera.name,
        position: Cesium.Cartesian3.fromDegrees(camera.longitude, camera.latitude, config.water.baseHeight + 18),
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString("#47d7ac"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: camera.name,
          font: "14px Microsoft JhengHei",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -24),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        description: camera.note,
      });

      cctvEntities[camera.id] = entity;
    });
  }

  function addLocalBasemapEntity() {
    if (!config.localBasemap) {
      return;
    }

    localBasemapPrimitive = viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: Cesium.Rectangle.fromDegrees(
          config.localBasemap.west,
          config.localBasemap.south,
          config.localBasemap.east,
          config.localBasemap.north,
          ),
          height: config.water.baseHeight - 10,
          vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        }),
      }),
      appearance: new Cesium.EllipsoidSurfaceAppearance({
        aboveGround: true,
        material: Cesium.Material.fromType("Image", {
          image: config.localBasemap.url,
        }),
      }),
      asynchronous: false,
    }));
  }

  function addRoadEntities() {
    roadEntities = sampleData.roads.map(function (road) {
      return {
        minLevel: road.minLevel,
        entity: viewer.entities.add({
          id: road.id,
          name: road.name,
          polyline: {
            positions: road.coordinates.map(function (xy) {
              return Cesium.Cartesian3.fromDegrees(xy[0], xy[1], config.water.baseHeight + 6);
            }),
            width: 5,
            material: Cesium.Color.fromCssColorString("#fafafa").withAlpha(0.86),
            clampToGround: false,
          },
        }),
      };
    });
  }

  function updateCctvAndRoads(waterLevel) {
    var affected = model.getAffectedCctv(sampleData.cctv, waterLevel, config.water.safetyBuffer);
    var affectedMap = {};

    affected.affectedIds.forEach(function (id) {
      affectedMap[id] = true;
    });

    sampleData.cctv.forEach(function (camera) {
      var entity = cctvEntities[camera.id];
      var isAffected = Boolean(affectedMap[camera.id]);

      entity.show = dom.toggleCctv.checked;
      entity.point.color = isAffected
        ? Cesium.Color.fromCssColorString("#ff5f56")
        : Cesium.Color.fromCssColorString("#47d7ac");
      entity.label.text = isAffected ? camera.name + " 受影響" : camera.name;
    });

    var blockedRoads = 0;
    roadEntities.forEach(function (road) {
      var isBlocked = waterLevel >= road.minLevel;
      road.entity.polyline.material = isBlocked
        ? Cesium.Color.fromCssColorString("#ff5f56")
        : Cesium.Color.fromCssColorString("#fafafa").withAlpha(0.86);
      road.entity.polyline.width = isBlocked ? 8 : 5;
      blockedRoads += isBlocked ? 1 : 0;
    });

    dom.affectedCctvCount.textContent = String(affected.affected);
    dom.roadBreakCount.textContent = String(blockedRoads);
  }

  function styleDebrisArea(dataSource) {
    dataSource.entities.values.forEach(function (entity) {
      if (entity.polygon) {
        entity.polygon.material = Cesium.Color.fromCssColorString("#f4a340").withAlpha(config.debris.maxAreaAlpha);
        entity.polygon.outline = false;
      }
    });
  }

  function styleDebrisStream(dataSource) {
    dataSource.entities.values.forEach(function (entity) {
      if (entity.polyline) {
        entity.polyline.width = config.debris.streamWidth;
        entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.16,
          color: Cesium.Color.fromCssColorString("#b94d2c").withAlpha(0.9),
        });
      }
    });
  }

  function loadDebrisLayers() {
    var layerJobs = [];

    if (root.CESIUM_STAGE_DEBRIS_AREAS) {
      layerJobs.push(Cesium.GeoJsonDataSource.load(root.CESIUM_STAGE_DEBRIS_AREAS, {
        clampToGround: true,
      }).then(function (dataSource) {
        dataSource.name = "土石流潛勢區";
        styleDebrisArea(dataSource);
        debrisAreaSource = dataSource;
        viewer.dataSources.add(dataSource);
      }));
    }

    if (root.CESIUM_STAGE_DEBRIS_STREAMS) {
      layerJobs.push(Cesium.GeoJsonDataSource.load(root.CESIUM_STAGE_DEBRIS_STREAMS, {
        clampToGround: true,
      }).then(function (dataSource) {
        dataSource.name = "土石流潛勢溪流";
        styleDebrisStream(dataSource);
        debrisStreamSource = dataSource;
        viewer.dataSources.add(dataSource);
      }));
    }

    Promise.all(layerJobs).then(function () {
      setStatus("Cesium MVP 已載入：淹水展示、CCTV、土石流潛勢區與潛勢溪流。");
      applyLayerVisibility();
    }).catch(function (error) {
      console.error(error);
      setStatus("土石流圖資載入失敗，請檢查轉換後的 JS 資料。", "error");
    });
  }

  function applyLayerVisibility() {
    floodPrimitives.forEach(function (primitive) {
      primitive.show = dom.toggleFlood.checked;
    });

    Object.keys(cctvEntities).forEach(function (id) {
      cctvEntities[id].show = dom.toggleCctv.checked;
    });

    if (debrisAreaSource) {
      debrisAreaSource.show = dom.toggleDebrisArea.checked;
    }

    if (debrisStreamSource) {
      debrisStreamSource.show = dom.toggleDebrisStream.checked;
    }
  }

  function updateScenario() {
    var waterLevel = getWaterLevel();
    dom.waterLevel.value = String(waterLevel);
    dom.waterLevelValue.textContent = waterLevel.toFixed(1);

    renderFlood(waterLevel);
    updateCctvAndRoads(waterLevel);
    applyLayerVisibility();
  }

  function bindUi() {
    dom.waterLevel.addEventListener("input", updateScenario);
    dom.toggleFlood.addEventListener("change", updateScenario);
    dom.toggleCctv.addEventListener("change", updateScenario);
    dom.toggleDebrisArea.addEventListener("change", applyLayerVisibility);
    dom.toggleDebrisStream.addEventListener("change", applyLayerVisibility);
  }

  function initViewer() {
    var baseLayer = false;

    if (!config.localBasemap) {
      baseLayer = new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({
        url: config.imagery.url,
        credit: config.imagery.credit,
        maximumLevel: config.imagery.maximumLevel,
      }));
    }

    viewer = new Cesium.Viewer("cesiumContainer", {
      animation: false,
      baseLayer: baseLayer,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: true,
      sceneModePicker: false,
      selectionIndicator: true,
      timeline: false,
      navigationHelpButton: false,
      skyBox: false,
      skyAtmosphere: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    });

    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.baseColor = Cesium.Color.WHITE;
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#edf3f6");
    viewer.scene.highDynamicRange = false;
    viewer.scene.fog.enabled = false;
    viewer.shadows = false;
    viewer.scene.requestRenderMode = false;
    viewer.camera.lookAt(
      Cesium.Cartesian3.fromDegrees(config.camera.longitude, config.camera.latitude, 0),
      new Cesium.HeadingPitchRange(
        toRadians(config.camera.heading),
        toRadians(config.camera.pitch),
        config.camera.range || config.camera.height,
      ),
    );
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  }

  function init() {
    if (!Cesium || !config || !sampleData || !model) {
      setStatus("必要的 Cesium 或專案設定尚未載入。", "error");
      return;
    }

    dom.waterLevel.min = String(config.water.min);
    dom.waterLevel.max = String(config.water.max);
    dom.waterLevel.step = String(config.water.step);
    dom.waterLevel.value = String(config.water.initial);

    initViewer();
    bindUi();
    addLocalBasemapEntity();
    addCctvEntities();
    addRoadEntities();
    updateScenario();
    loadDebrisLayers();
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
