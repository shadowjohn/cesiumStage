const test = require("node:test");
const assert = require("node:assert/strict");

const buildingModel = require("../assets/js/building-model.js");

test("parses Easymap identity GEOMETRYCOLLECTION polygon WKT", () => {
  const polygons = buildingModel.parseWktPolygons(
    "GEOMETRYCOLLECTION(POLYGON((120.6660002587846 24.11936456634613,120.666000717346 24.11923337111597,120.6659506235807 24.11923326158432,120.6660002587846 24.11936456634613)))",
  );

  assert.equal(polygons.length, 1);
  assert.equal(polygons[0].outerRing.length, 3);
  assert.deepEqual(polygons[0].outerRing[0], [120.6660002587846, 24.11936456634613]);
});

test("supports multipolygon WKT and strips duplicate closing points", () => {
  const polygons = buildingModel.parseWktPolygons(
    "MULTIPOLYGON(((120.1 24.1,120.2 24.1,120.2 24.2,120.1 24.1)),((120.3 24.3,120.4 24.3,120.4 24.4,120.3 24.3)))",
  );

  assert.equal(polygons.length, 2);
  assert.equal(polygons[0].outerRing.length, 3);
  assert.equal(polygons[1].outerRing.length, 3);
});

test("classifies and measures building height from floor count", () => {
  assert.equal(buildingModel.normalizeFloors("0"), 1);
  assert.equal(buildingModel.normalizeFloors("12"), 12);
  assert.equal(buildingModel.classifyBuildingFloors(6), "low");
  assert.equal(buildingModel.classifyBuildingFloors(13), "mid");
  assert.equal(buildingModel.classifyBuildingFloors(24), "high");
  assert.equal(buildingModel.getExtrudedHeight(6, { baseHeight: 78, floorHeight: 3.5 }), 99);
});

test("detects whether a building centroid is inside a flood polygon", () => {
  const polygon = {
    outerRing: [
      [120.0, 24.0],
      [121.0, 24.0],
      [121.0, 25.0],
      [120.0, 25.0],
    ],
    holes: [],
  };

  assert.deepEqual(buildingModel.getPolygonCentroid(polygon), [120.5, 24.5]);
  assert.equal(buildingModel.isPointInRing([120.5, 24.5], polygon.outerRing), true);
  assert.equal(buildingModel.isPointInRing([121.5, 24.5], polygon.outerRing), false);
});
