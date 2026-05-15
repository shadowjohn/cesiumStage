(function (root) {
  "use strict";

  function toNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeFloors(value) {
    return Math.max(1, Math.round(toNumber(value, 1)));
  }

  function classifyBuildingFloors(floors) {
    var normalized = normalizeFloors(floors);

    if (normalized > 20) {
      return "high";
    }

    if (normalized > 10) {
      return "mid";
    }

    return "low";
  }

  function getExtrudedHeight(floors, settings) {
    var baseHeight = toNumber(settings && settings.baseHeight, 0);
    var floorHeight = toNumber(settings && settings.floorHeight, 3.5);

    return baseHeight + normalizeFloors(floors) * floorHeight;
  }

  function stripSrid(wkt) {
    return String(wkt || "").trim().replace(/^SRID=\d+;\s*/i, "");
  }

  function getTypedBody(wkt, type) {
    var text = stripSrid(wkt);
    var prefix = new RegExp("^" + type + "\\s*\\(", "i");

    if (!prefix.test(text)) {
      return null;
    }

    text = text.replace(prefix, "");

    if (text.charAt(text.length - 1) === ")") {
      text = text.slice(0, -1);
    }

    return text.trim();
  }

  function splitTopLevel(text) {
    var parts = [];
    var depth = 0;
    var start = 0;
    var i;
    var ch;

    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);

      if (ch === "(") {
        depth += 1;
      } else if (ch === ")") {
        depth -= 1;
      } else if (ch === "," && depth === 0) {
        parts.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }

    parts.push(text.slice(start).trim());

    return parts.filter(Boolean);
  }

  function hasOuterParens(text) {
    var depth = 0;
    var i;
    var ch;

    if (text.charAt(0) !== "(" || text.charAt(text.length - 1) !== ")") {
      return false;
    }

    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);

      if (ch === "(") {
        depth += 1;
      } else if (ch === ")") {
        depth -= 1;
      }

      if (depth === 0 && i < text.length - 1) {
        return false;
      }
    }

    return depth === 0;
  }

  function unwrapOuterParens(text) {
    var unwrapped = String(text || "").trim();

    while (hasOuterParens(unwrapped)) {
      unwrapped = unwrapped.slice(1, -1).trim();
    }

    return unwrapped;
  }

  function removeClosingDuplicate(points) {
    var first;
    var last;

    if (points.length < 2) {
      return points;
    }

    first = points[0];
    last = points[points.length - 1];

    if (Math.abs(first[0] - last[0]) < 1e-10 && Math.abs(first[1] - last[1]) < 1e-10) {
      return points.slice(0, -1);
    }

    return points;
  }

  function parseRing(text) {
    var points = unwrapOuterParens(text).split(",").map(function (pointText) {
      var parts = pointText.trim().split(/\s+/).map(Number);

      return [parts[0], parts[1]];
    }).filter(function (point) {
      return Number.isFinite(point[0]) && Number.isFinite(point[1]);
    });

    return removeClosingDuplicate(points);
  }

  function parsePolygonWkt(wkt) {
    var body = getTypedBody(wkt, "POLYGON");
    var rings;

    if (!body || /EMPTY/i.test(body)) {
      return [];
    }

    rings = splitTopLevel(body).map(parseRing).filter(function (ring) {
      return ring.length >= 3;
    });

    if (!rings.length) {
      return [];
    }

    return [{
      outerRing: rings[0],
      holes: rings.slice(1),
    }];
  }

  function parseMultiPolygonWkt(wkt) {
    var body = getTypedBody(wkt, "MULTIPOLYGON");

    if (!body || /EMPTY/i.test(body)) {
      return [];
    }

    return splitTopLevel(body).reduce(function (polygons, part) {
      return polygons.concat(parsePolygonWkt("POLYGON" + part));
    }, []);
  }

  function parseGeometryCollectionWkt(wkt) {
    var body = getTypedBody(wkt, "GEOMETRYCOLLECTION");

    if (!body || /EMPTY/i.test(body)) {
      return [];
    }

    return splitTopLevel(body).reduce(function (polygons, part) {
      return polygons.concat(parseWktPolygons(part));
    }, []);
  }

  function parseWktPolygons(wkt) {
    var text = stripSrid(wkt);

    if (/^GEOMETRYCOLLECTION/i.test(text)) {
      return parseGeometryCollectionWkt(text);
    }

    if (/^MULTIPOLYGON/i.test(text)) {
      return parseMultiPolygonWkt(text);
    }

    if (/^POLYGON/i.test(text)) {
      return parsePolygonWkt(text);
    }

    return [];
  }

  function getPolygonCentroid(polygon) {
    var ring = polygon && polygon.outerRing ? polygon.outerRing : [];
    var totalLon = 0;
    var totalLat = 0;

    if (!ring.length) {
      return [0, 0];
    }

    ring.forEach(function (point) {
      totalLon += point[0];
      totalLat += point[1];
    });

    return [totalLon / ring.length, totalLat / ring.length];
  }

  function isPointInRing(point, ring) {
    var inside = false;
    var x = point[0];
    var y = point[1];
    var i;
    var j;
    var xi;
    var yi;
    var xj;
    var yj;
    var intersects;

    for (i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      xi = ring[i][0];
      yi = ring[i][1];
      xj = ring[j][0];
      yj = ring[j][1];
      intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }

  var api = {
    normalizeFloors: normalizeFloors,
    classifyBuildingFloors: classifyBuildingFloors,
    getExtrudedHeight: getExtrudedHeight,
    parseWktPolygons: parseWktPolygons,
    getPolygonCentroid: getPolygonCentroid,
    isPointInRing: isPointInRing,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.CESIUM_STAGE_BUILDING_MODEL = api;
})(typeof window !== "undefined" ? window : globalThis);
