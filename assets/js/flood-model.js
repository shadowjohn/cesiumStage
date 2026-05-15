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

  var api = {
    clampWaterLevel: clampWaterLevel,
    getAffectedCctv: getAffectedCctv,
    getVisibleFloodBands: getVisibleFloodBands,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.CESIUM_STAGE_MODEL = api;
})(typeof window !== "undefined" ? window : globalThis);
