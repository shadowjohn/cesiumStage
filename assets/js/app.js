(function (root) {
  "use strict";

  var Cesium = root.Cesium;
  var config = root.CESIUM_STAGE_CONFIG;
  var sampleData = root.CESIUM_STAGE_SAMPLE_DATA;
  var model = root.CESIUM_STAGE_MODEL;
  var buildingModel = root.CESIUM_STAGE_BUILDING_MODEL;
  var buildingData = root.CESIUM_STAGE_TAICHUNG_BUILDINGS;
  var viewer = null;
  var activeScenario = null;
  var floodPrimitives = [];
  var foamEntities = [];
  var gaugeEntities = [];
  var localBasemapPrimitive = null;
  var cctvEntities = {};
  var cctvRingEntities = {};
  var roadEntities = [];
  var buildingEntities = [];
  var buildingFloodCollars = [];
  var debrisFlowEntities = [];
  var autoRiseTimer = null;
  var debrisAreaSource = null;
  var debrisStreamSource = null;

  var dom = {
    waterLevel: document.getElementById("waterLevel"),
    waterLevelValue: document.getElementById("waterLevelValue"),
    playScenario: document.getElementById("playScenario"),
    resetScenario: document.getElementById("resetScenario"),
    alertBanner: document.getElementById("alertBanner"),
    alertLevel: document.getElementById("alertLevel"),
    alertMessage: document.getElementById("alertMessage"),
    scenarioSelect: document.getElementById("scenarioSelect"),
    scenarioHeightLabel: document.getElementById("scenarioHeightLabel"),
    impactHeadline: document.getElementById("impactHeadline"),
    impactDetail: document.getElementById("impactDetail"),
    floodBandCount: document.getElementById("floodBandCount"),
    affectedCctvCount: document.getElementById("affectedCctvCount"),
    roadBreakCount: document.getElementById("roadBreakCount"),
    buildingFloodCount: document.getElementById("buildingFloodCount"),
    statusText: document.getElementById("statusText"),
    toggleFlood: document.getElementById("toggleFlood"),
    toggleBuildings: document.getElementById("toggleBuildings"),
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

  function getClockSeconds() {
    return viewer ? viewer.clock.currentTime.secondsOfDay : 0;
  }

  function getScenarioList() {
    return sampleData.floodScenarios && sampleData.floodScenarios.length
      ? sampleData.floodScenarios
      : [{
        id: "default",
        name: "預設示範區",
        summary: "預設淹水展示資料。",
        demBaseHeight: config.water.baseHeight,
        initialLevel: config.water.initial,
        floodBands: sampleData.floodBands || [],
        cctv: sampleData.cctv || [],
        roads: sampleData.roads || [],
      }];
  }

  function getScenarioById(id) {
    var scenarios = getScenarioList();

    return scenarios.find(function (scenario) {
      return scenario.id === id;
    }) || scenarios[0];
  }

  function getActiveScenario() {
    if (!activeScenario) {
      activeScenario = getScenarioList()[0];
    }

    return activeScenario;
  }

  function getScenarioBaseHeight() {
    return Number(getActiveScenario().demBaseHeight) || config.water.baseHeight;
  }

  function getScenarioFloodBands() {
    return getActiveScenario().floodBands || sampleData.floodBands || [];
  }

  function getScenarioCctv() {
    return getActiveScenario().cctv || sampleData.cctv || [];
  }

  function getScenarioRoads() {
    return getActiveScenario().roads || sampleData.roads || [];
  }

  function getBuildingHeightSettings() {
    return {
      baseHeight: getScenarioBaseHeight(),
      floorHeight: config.buildings.floorHeight,
    };
  }

  function pulseColor(cssColor, minAlpha, maxAlpha, speed, phase) {
    return new Cesium.CallbackProperty(function () {
      var wave = (Math.sin(getClockSeconds() * speed + (phase || 0)) + 1) / 2;
      var alpha = minAlpha + (maxAlpha - minAlpha) * wave;

      return Cesium.Color.fromCssColorString(cssColor).withAlpha(alpha);
    }, false);
  }

  function toCartesianPath(path, height) {
    return path.map(function (xy) {
      return Cesium.Cartesian3.fromDegrees(xy[0], xy[1], height);
    });
  }

  function flattenRing(ring) {
    var flat = [];

    ring.forEach(function (xy) {
      flat.push(xy[0], xy[1]);
    });

    return flat;
  }

  function createPolygonHierarchy(polygon) {
    var holes = (polygon.holes || []).map(function (ring) {
      return new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(flattenRing(ring)));
    });

    return new Cesium.PolygonHierarchy(
      Cesium.Cartesian3.fromDegreesArray(flattenRing(polygon.outerRing)),
      holes,
    );
  }

  function getReadyStatus() {
    var buildingCount = buildingEntities.length ? "，台中 3D 建物 " + buildingEntities.length + " 棟" : "";

    return getActiveScenario().name + " 已載入：淹水展示、CCTV、土石流潛勢區與潛勢溪流" + buildingCount + "。";
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

    foamEntities.forEach(function (entity) {
      viewer.entities.remove(entity);
    });
    foamEntities = [];
  }

  function clearGaugeEntities() {
    gaugeEntities.forEach(function (entity) {
      viewer.entities.remove(entity);
    });
    gaugeEntities = [];
  }

  function clearCctvEntities() {
    Object.keys(cctvEntities).forEach(function (id) {
      viewer.entities.remove(cctvEntities[id]);
    });
    Object.keys(cctvRingEntities).forEach(function (id) {
      viewer.entities.remove(cctvRingEntities[id]);
    });
    cctvEntities = {};
    cctvRingEntities = {};
  }

  function clearRoadEntities() {
    roadEntities.forEach(function (road) {
      viewer.entities.remove(road.entity);
    });
    roadEntities = [];
  }

  function clearBuildingFloodCollars() {
    buildingFloodCollars.forEach(function (entity) {
      viewer.entities.remove(entity);
    });
    buildingFloodCollars = [];
  }

  function clearBuildingEntities() {
    clearBuildingFloodCollars();
    buildingEntities.forEach(function (building) {
      viewer.entities.remove(building.entity);
    });
    buildingEntities = [];
  }

  function createFloodPrimitive(band, waterLevel, index) {
    var height = getScenarioBaseHeight() + waterLevel + index * 0.12;
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

  function createFoamEntity(band, waterLevel, index) {
    var closed = band.coordinates.concat([band.coordinates[0]]);
    var height = getScenarioBaseHeight() + waterLevel + index * 0.14 + 0.3;

    return viewer.entities.add({
      id: band.id + "-foam",
      name: band.name + " 岸邊泡沫",
      polyline: {
        positions: toCartesianPath(closed, height),
        width: 3 + index,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.28,
          color: pulseColor("#d9f7ff", 0.35, 0.96, 4.2, index),
        }),
        clampToGround: false,
      },
    });
  }

  function renderFlood(waterLevel) {
    clearFloodPrimitives();

    if (!dom.toggleFlood.checked) {
      dom.floodBandCount.textContent = "0";
      return;
    }

    var visibleBands = model.getVisibleFloodBands(getScenarioFloodBands(), waterLevel);
    visibleBands.forEach(function (band, index) {
      floodPrimitives.push(createFloodPrimitive(band, waterLevel, index));
      foamEntities.push(createFoamEntity(band, waterLevel, index));
    });

    dom.floodBandCount.textContent = String(visibleBands.length);
  }

  function updateFloodGauge(waterLevel) {
    var scenario = getActiveScenario();
    var camera = scenario.camera || {};
    var lon = Number(camera.longitude) || config.camera.longitude;
    var lat = Number(camera.latitude) || config.camera.latitude;
    var baseHeight = getScenarioBaseHeight();
    var waterHeight = baseHeight + waterLevel;

    clearGaugeEntities();

    gaugeEntities.push(viewer.entities.add({
      id: "scenario-water-gauge-line",
      name: scenario.name + " 水位尺",
      polyline: {
        positions: [
          Cesium.Cartesian3.fromDegrees(lon, lat, baseHeight),
          Cesium.Cartesian3.fromDegrees(lon, lat, waterHeight),
        ],
        width: 6,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.24,
          color: pulseColor("#d9f7ff", 0.72, 1, 4.4, 0),
        }),
        clampToGround: false,
      },
    }));

    gaugeEntities.push(viewer.entities.add({
      id: "scenario-water-gauge-label",
      name: scenario.name + " 水位高度",
      position: Cesium.Cartesian3.fromDegrees(lon, lat, waterHeight + 8),
      label: {
        text: "DEM " + baseHeight.toFixed(1) + "m / 水深 " + waterLevel.toFixed(1) + "m",
        font: "800 17px Microsoft JhengHei",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 5,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    }));
  }

  function addCctvEntities() {
    getScenarioCctv().forEach(function (camera) {
      var entity = viewer.entities.add({
        id: camera.id,
        name: camera.name,
        position: Cesium.Cartesian3.fromDegrees(camera.longitude, camera.latitude, getScenarioBaseHeight() + 18),
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString("#47d7ac"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: camera.name,
          font: "700 18px Microsoft JhengHei",
          fillColor: Cesium.Color.fromCssColorString("#f8fbff"),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 5,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -30),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        description: camera.note,
      });

      cctvEntities[camera.id] = entity;
      cctvRingEntities[camera.id] = viewer.entities.add({
        id: camera.id + "-alert-ring",
        name: camera.name + " 警戒圈",
        position: Cesium.Cartesian3.fromDegrees(camera.longitude, camera.latitude, getScenarioBaseHeight() + 2),
        show: false,
        ellipse: {
          semiMajorAxis: new Cesium.CallbackProperty(function () {
            return 280 + Math.sin(getClockSeconds() * 5) * 70;
          }, false),
          semiMinorAxis: new Cesium.CallbackProperty(function () {
            return 280 + Math.sin(getClockSeconds() * 5) * 70;
          }, false),
          material: new Cesium.ColorMaterialProperty(pulseColor("#ff5f56", 0.08, 0.36, 5, 0)),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#ff5f56").withAlpha(0.9),
          height: getScenarioBaseHeight() + 1,
        },
      });
    });
  }

  function addLocalBasemapEntity() {
    if (!config.localBasemap || config.imagery.useLiveTiles) {
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
    roadEntities = getScenarioRoads().map(function (road) {
      return {
        id: road.id,
        name: road.name,
        minLevel: road.minLevel,
        entity: viewer.entities.add({
          id: road.id,
          name: road.name,
          polyline: {
            positions: road.coordinates.map(function (xy) {
              return Cesium.Cartesian3.fromDegrees(xy[0], xy[1], getScenarioBaseHeight() + 6);
            }),
            width: 5,
            material: Cesium.Color.fromCssColorString("#fafafa").withAlpha(0.86),
            clampToGround: false,
          },
        }),
      };
    });
  }

  function getBuildingMaterial(floors, flooded, phase) {
    var colors = config.buildings.colors || {};
    var buildingClass;
    var cssColor;

    if (flooded) {
      return new Cesium.ColorMaterialProperty(
        pulseColor(colors.flooded || "#3aa0ff", 0.46, 0.92, 5.2, phase || 0),
      );
    }

    buildingClass = buildingModel.classifyBuildingFloors(floors);
    cssColor = colors[buildingClass] || colors.low || "#b8f7ff";

    return Cesium.Color.fromCssColorString(cssColor).withAlpha(config.buildings.defaultAlpha);
  }

  function addTaichungBuildings() {
    var features;
    var maxFeatures;

    if (!config.buildings.enabled || !buildingData || !buildingModel) {
      dom.buildingFloodCount.textContent = "0";
      return;
    }

    features = buildingData.features || [];
    maxFeatures = Math.min(features.length, config.buildings.maxFeatures || features.length);

    features.slice(0, maxFeatures).forEach(function (feature, featureIndex) {
      var floors = buildingModel.normalizeFloors(feature.b1d);
      var polygons = buildingModel.parseWktPolygons(feature.ORZ_WKT);

      polygons.forEach(function (polygon, polygonIndex) {
        var entity = viewer.entities.add({
          id: "taichung-building-" + feature.ogc_fid + "-" + polygonIndex,
          name: "台中建物 " + feature.ogc_fid,
          polygon: {
            hierarchy: createPolygonHierarchy(polygon),
            height: getScenarioBaseHeight(),
            extrudedHeight: buildingModel.getExtrudedHeight(floors, getBuildingHeightSettings()),
            material: getBuildingMaterial(floors, false, featureIndex),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(config.buildings.colors.outline || "#061018").withAlpha(0.76),
            closeTop: true,
            closeBottom: true,
          },
          description: "ogc_fid: " + feature.ogc_fid + "<br>樓層: " + floors + "F<br>來源: " + config.buildings.sourceLabel,
        });

        buildingEntities.push({
          entity: entity,
          floors: floors,
          polygon: polygon,
          centroid: buildingModel.getPolygonCentroid(polygon),
          flooded: false,
          phase: featureIndex * 0.11 + polygonIndex * 0.37,
        });
      });
    });
  }

  function isPointInVisibleFlood(point, visibleBands) {
    return visibleBands.some(function (band) {
      return buildingModel.isPointInRing(point, band.coordinates || []);
    });
  }

  function addBuildingFloodCollar(building, waterLevel) {
    var baseHeight = getScenarioBaseHeight() + 0.05;
    var collarHeight = getScenarioBaseHeight() + Math.max(waterLevel, 0.45);

    buildingFloodCollars.push(viewer.entities.add({
      id: "flood-collar-" + building.entity.id,
      name: building.entity.name + " 貼邊水深",
      polygon: {
        hierarchy: createPolygonHierarchy(building.polygon),
        height: baseHeight,
        extrudedHeight: collarHeight,
        material: new Cesium.ColorMaterialProperty(
          pulseColor(config.buildings.colors.flooded || "#3aa0ff", 0.16, 0.44, 4.8, building.phase),
        ),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#d9f7ff").withAlpha(0.72),
        closeTop: true,
        closeBottom: false,
      },
    }));
  }

  function updateBuildings(waterLevel) {
    var visibleBands;
    var floodedCount = 0;

    if (!buildingEntities.length || !buildingModel) {
      dom.buildingFloodCount.textContent = "0";
      return;
    }

    visibleBands = model.getVisibleFloodBands(getScenarioFloodBands(), waterLevel);
    clearBuildingFloodCollars();

    buildingEntities.forEach(function (building) {
      var flooded = waterLevel >= config.buildings.floodHighlightLevel
        && isPointInVisibleFlood(building.centroid, visibleBands);

      building.entity.show = dom.toggleBuildings.checked;

      if (building.flooded !== flooded) {
        building.flooded = flooded;
        building.entity.polygon.material = getBuildingMaterial(building.floors, flooded, building.phase);
      }

      if (flooded && dom.toggleBuildings.checked) {
        floodedCount += 1;

        if (buildingFloodCollars.length < config.buildings.maxFloodCollars) {
          addBuildingFloodCollar(building, waterLevel);
        }
      }
    });

    dom.buildingFloodCount.textContent = String(floodedCount);
  }

  function updateCctvAndRoads(waterLevel) {
    var cctv = getScenarioCctv();
    var roads = getScenarioRoads();
    var affected = model.getAffectedCctv(cctv, waterLevel, config.water.safetyBuffer);
    var blocked = model.getBlockedRoads(roads, waterLevel);
    var affectedMap = {};
    var blockedMap = {};

    affected.affectedIds.forEach(function (id) {
      affectedMap[id] = true;
    });

    blocked.blockedIds.forEach(function (id) {
      blockedMap[id] = true;
    });

    cctv.forEach(function (camera) {
      var entity = cctvEntities[camera.id];
      var ring = cctvRingEntities[camera.id];
      var isAffected = Boolean(affectedMap[camera.id]);

      entity.show = dom.toggleCctv.checked;
      entity.point.color = isAffected
        ? Cesium.Color.fromCssColorString("#ff5f56")
        : Cesium.Color.fromCssColorString("#47d7ac");
      entity.point.pixelSize = isAffected ? 16 : 12;
      entity.label.text = isAffected ? camera.name + " 受影響" : camera.name;
      ring.show = dom.toggleCctv.checked && isAffected;
    });

    roadEntities.forEach(function (road) {
      var isBlocked = Boolean(blockedMap[road.id]);
      road.entity.polyline.material = isBlocked
        ? new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          color: pulseColor("#ff5f56", 0.62, 1, 5.5, road.minLevel),
        })
        : Cesium.Color.fromCssColorString("#fafafa").withAlpha(0.86);
      road.entity.polyline.width = isBlocked ? 8 : 5;
    });

    dom.affectedCctvCount.textContent = String(affected.affected);
    dom.roadBreakCount.textContent = String(blocked.blocked);
  }

  function updateImpactText(waterLevel) {
    var forecast = model.getImpactForecast(waterLevel, config.water);
    var affected = model.getAffectedCctv(getScenarioCctv(), waterLevel, config.water.safetyBuffer);
    var blocked = model.getBlockedRoads(getScenarioRoads(), waterLevel);
    var label = forecast.severity === "critical" ? "CRITICAL" : forecast.severity === "warning" ? "WARNING" : "WATCH";
    var scenario = getActiveScenario();

    dom.alertBanner.className = "alert-banner is-" + forecast.severity;
    dom.alertLevel.textContent = label;
    dom.alertMessage.textContent = scenario.summary || forecast.message;
    dom.impactHeadline.textContent = scenario.name + " / " + label + " / 水位 " + waterLevel.toFixed(1) + "m";
    dom.impactDetail.textContent = "DEM 基準約 " + getScenarioBaseHeight().toFixed(1) + "m，預估 "
      + forecast.minutes + " 分鐘後擴大影響；CCTV "
      + affected.affected + "/" + affected.total + " 受影響，道路 "
      + blocked.blocked + "/" + blocked.total + " 中斷，受淹建物 "
      + dom.buildingFloodCount.textContent + " 棟，土石流示範流路依水位啟動。";
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

  function buildPathSampler(path) {
    var positions = toCartesianPath(path, getScenarioBaseHeight() + 35);
    var segments = [];
    var total = 0;

    for (var i = 0; i < positions.length - 1; i++) {
      var length = Cesium.Cartesian3.distance(positions[i], positions[i + 1]);
      segments.push({ start: positions[i], end: positions[i + 1], length: length });
      total += length;
    }

    return function (progress) {
      var target = (progress % 1) * total;
      var walked = 0;

      for (var j = 0; j < segments.length; j++) {
        var segment = segments[j];
        if (walked + segment.length >= target) {
          var local = (target - walked) / segment.length;
          return Cesium.Cartesian3.lerp(segment.start, segment.end, local, new Cesium.Cartesian3());
        }
        walked += segment.length;
      }

      return positions[positions.length - 1];
    };
  }

  function addDebrisFlowDemo() {
    debrisFlowEntities.forEach(function (flow) {
      viewer.entities.remove(flow.line);
      flow.particles.forEach(function (particle) {
        viewer.entities.remove(particle);
      });
    });

    debrisFlowEntities = (sampleData.debrisFlows || []).map(function (flow, flowIndex) {
      var sampler = buildPathSampler(flow.coordinates);
      var pathPositions = toCartesianPath(flow.coordinates, getScenarioBaseHeight() + 18);
      var line = viewer.entities.add({
        id: flow.id,
        name: flow.name,
        show: false,
        polyline: {
          positions: pathPositions,
          width: 9,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.32,
            color: pulseColor("#b94d2c", 0.55, 1, 4.8, flowIndex),
          }),
          clampToGround: false,
        },
      });
      var particles = [];

      for (var i = 0; i < 5; i++) {
        (function (particleIndex) {
          particles.push(viewer.entities.add({
            id: flow.id + "-particle-" + particleIndex,
            name: flow.name + " 泥流粒子",
            show: false,
            position: new Cesium.CallbackProperty(function () {
              var progress = getClockSeconds() * config.debris.particleSpeed + particleIndex * 0.18 + flowIndex * 0.08;
              return sampler(progress);
            }, false),
            point: {
              pixelSize: 11 - particleIndex,
              color: Cesium.Color.fromCssColorString("#7a351f").withAlpha(0.92),
              outlineColor: Cesium.Color.fromCssColorString("#ffcf8a").withAlpha(0.85),
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          }));
        })(i);
      }

      return {
        minLevel: flow.minLevel,
        line: line,
        particles: particles,
      };
    });
  }

  function updateDebrisDemo(waterLevel) {
    debrisFlowEntities.forEach(function (flow) {
      var active = dom.toggleDebrisStream.checked && waterLevel >= flow.minLevel;

      flow.line.show = active;
      flow.particles.forEach(function (particle) {
        particle.show = active;
      });
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
      setStatus(getReadyStatus());
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

    foamEntities.forEach(function (entity) {
      entity.show = dom.toggleFlood.checked;
    });

    gaugeEntities.forEach(function (entity) {
      entity.show = dom.toggleFlood.checked;
    });

    Object.keys(cctvEntities).forEach(function (id) {
      cctvEntities[id].show = dom.toggleCctv.checked;
    });

    buildingEntities.forEach(function (building) {
      building.entity.show = dom.toggleBuildings.checked;
    });

    buildingFloodCollars.forEach(function (entity) {
      entity.show = dom.toggleFlood.checked && dom.toggleBuildings.checked;
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
    updateFloodGauge(waterLevel);
    updateCctvAndRoads(waterLevel);
    updateBuildings(waterLevel);
    updateDebrisDemo(waterLevel);
    updateImpactText(waterLevel);
    applyLayerVisibility();
  }

  function stopAutoRise() {
    if (autoRiseTimer) {
      root.clearInterval(autoRiseTimer);
      autoRiseTimer = null;
    }
    dom.playScenario.textContent = "播放升水";
  }

  function toggleAutoRise() {
    if (autoRiseTimer) {
      stopAutoRise();
      return;
    }

    dom.playScenario.textContent = "暫停";
    autoRiseTimer = root.setInterval(function () {
      var nextLevel = getWaterLevel() + config.water.autoRiseStep;

      if (nextLevel >= config.water.max) {
        dom.waterLevel.value = String(config.water.max);
        updateScenario();
        stopAutoRise();
        return;
      }

      dom.waterLevel.value = String(nextLevel.toFixed(2));
      updateScenario();
    }, config.water.autoRiseIntervalMs);
  }

  function resetScenario() {
    stopAutoRise();
    dom.waterLevel.value = String(getActiveScenario().initialLevel || config.water.initial);
    updateScenario();
  }

  function flyToScenario(immediate) {
    var scenario = getActiveScenario();
    var camera = scenario.camera || {};
    var longitude = Number(camera.longitude) || config.camera.longitude;
    var latitude = Number(camera.latitude) || config.camera.latitude;
    var range = Number(camera.range) || config.camera.range || config.camera.height;
    var pitch = Number(camera.pitch);

    if (!Number.isFinite(pitch)) {
      pitch = config.camera.pitch;
    }

    if (immediate) {
      viewer.camera.lookAt(
        Cesium.Cartesian3.fromDegrees(longitude, latitude, getScenarioBaseHeight()),
        new Cesium.HeadingPitchRange(
          toRadians(config.camera.heading),
          toRadians(pitch),
          range,
        ),
      );
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      return;
    }

    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(
        Cesium.Cartesian3.fromDegrees(longitude, latitude, getScenarioBaseHeight()),
        range * 0.38,
      ),
      {
        duration: 1.2,
        offset: new Cesium.HeadingPitchRange(
          toRadians(config.camera.heading),
          toRadians(pitch),
          range,
        ),
      },
    );
  }

  function populateScenarioSelect() {
    getScenarioList().forEach(function (scenario) {
      var option = document.createElement("option");
      option.value = scenario.id;
      option.textContent = scenario.name;
      dom.scenarioSelect.appendChild(option);
    });

    activeScenario = getScenarioList()[0];
    dom.scenarioSelect.value = activeScenario.id;
  }

  function refreshScenarioShell() {
    dom.scenarioHeightLabel.textContent = "DEM " + getScenarioBaseHeight().toFixed(1) + " m";
    dom.waterLevel.value = String(getActiveScenario().initialLevel || config.water.initial);
  }

  function rebuildScenarioEntities() {
    clearFloodPrimitives();
    clearGaugeEntities();
    clearCctvEntities();
    clearRoadEntities();
    clearBuildingEntities();
    addCctvEntities();
    addRoadEntities();
    addTaichungBuildings();
    addDebrisFlowDemo();
    refreshScenarioShell();
    updateScenario();
    setStatus(getReadyStatus());
  }

  function handleScenarioChange() {
    activeScenario = getScenarioById(dom.scenarioSelect.value);
    stopAutoRise();
    rebuildScenarioEntities();
    flyToScenario(false);
  }

  function bindUi() {
    dom.scenarioSelect.addEventListener("change", handleScenarioChange);
    dom.waterLevel.addEventListener("input", updateScenario);
    dom.playScenario.addEventListener("click", toggleAutoRise);
    dom.resetScenario.addEventListener("click", resetScenario);
    dom.toggleFlood.addEventListener("change", updateScenario);
    dom.toggleBuildings.addEventListener("change", updateScenario);
    dom.toggleCctv.addEventListener("change", updateScenario);
    dom.toggleDebrisArea.addEventListener("change", updateScenario);
    dom.toggleDebrisStream.addEventListener("change", updateScenario);
  }

  function initViewer() {
    var baseLayer = false;

    if (config.imagery.useLiveTiles) {
      baseLayer = new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({
        url: config.imagery.url,
        credit: config.imagery.credit,
        maximumLevel: config.imagery.maximumLevel,
        enablePickFeatures: false,
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
    if (!Cesium || !config || !sampleData || !model || !buildingModel) {
      setStatus("必要的 Cesium 或專案設定尚未載入。", "error");
      return;
    }

    populateScenarioSelect();
    dom.waterLevel.min = String(config.water.min);
    dom.waterLevel.max = String(config.water.max);
    dom.waterLevel.step = String(config.water.step);
    refreshScenarioShell();

    initViewer();
    bindUi();
    addLocalBasemapEntity();
    flyToScenario(true);
    addCctvEntities();
    addRoadEntities();
    addTaichungBuildings();
    addDebrisFlowDemo();
    updateScenario();
    loadDebrisLayers();
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
