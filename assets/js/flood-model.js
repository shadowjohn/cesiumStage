(function (root) {
  "use strict";

  function toNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clampWaterLevel(value, range) {
    var min = toNumber(range && range.min, 0);
    var max = toNumber(range && range.max, min);
    var level = toNumber(value, min);

    return Math.min(Math.max(level, min), max);
  }

  function getAffectedCctv(cctvList, waterLevel, safetyBuffer) {
    var level = toNumber(waterLevel, 0);
    var buffer = toNumber(safetyBuffer, 0);
    var affectedIds = [];

    (cctvList || []).forEach(function (camera) {
      var groundElevation = toNumber(camera.groundElevation, Number.POSITIVE_INFINITY);

      if (groundElevation <= level + buffer) {
        affectedIds.push(camera.id);
      }
    });

    return {
      total: (cctvList || []).length,
      affected: affectedIds.length,
      affectedIds: affectedIds,
    };
  }

  function getVisibleFloodBands(floodBands, waterLevel) {
    var level = toNumber(waterLevel, 0);

    return (floodBands || []).filter(function (band) {
      return toNumber(band.minLevel, Number.POSITIVE_INFINITY) <= level;
    });
  }

  function getBlockedRoads(roads, waterLevel) {
    var level = toNumber(waterLevel, 0);
    var blockedIds = [];

    (roads || []).forEach(function (road) {
      if (level >= toNumber(road.minLevel, Number.POSITIVE_INFINITY)) {
        blockedIds.push(road.id);
      }
    });

    return {
      total: (roads || []).length,
      blocked: blockedIds.length,
      blockedIds: blockedIds,
    };
  }

  function getImpactForecast(waterLevel, range) {
    var min = toNumber(range && range.min, 0);
    var max = Math.max(toNumber(range && range.max, 5), min + 0.1);
    var level = clampWaterLevel(waterLevel, { min: min, max: max });
    var ratio = (level - min) / (max - min);
    var minutes = Math.max(3, Math.ceil((1 - ratio) * 28));
    var severity = ratio >= 0.8 ? "critical" : ratio >= 0.5 ? "warning" : "watch";
    var message = minutes + " 分鐘後低窪道路可能受淹，請優先確認 CCTV 與道路中斷點。";

    return {
      severity: severity,
      minutes: minutes,
      ratio: ratio,
      message: message,
    };
  }

  var api = {
    clampWaterLevel: clampWaterLevel,
    getAffectedCctv: getAffectedCctv,
    getVisibleFloodBands: getVisibleFloodBands,
    getBlockedRoads: getBlockedRoads,
    getImpactForecast: getImpactForecast,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.CESIUM_STAGE_MODEL = api;
})(typeof window !== "undefined" ? window : globalThis);
