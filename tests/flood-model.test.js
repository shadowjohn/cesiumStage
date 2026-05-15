const test = require("node:test");
const assert = require("node:assert/strict");

const floodModel = require("../assets/js/flood-model.js");

test("clampWaterLevel keeps values inside the configured range", () => {
  const range = { min: 0, max: 5 };

  assert.equal(floodModel.clampWaterLevel(-2, range), 0);
  assert.equal(floodModel.clampWaterLevel(2.75, range), 2.75);
  assert.equal(floodModel.clampWaterLevel(9, range), 5);
});

test("getAffectedCctv marks cameras below water level plus safety buffer", () => {
  const cctv = [
    { id: "cam-high", groundElevation: 16.2 },
    { id: "cam-edge", groundElevation: 13.2 },
    { id: "cam-low", groundElevation: 10.8 },
  ];

  const result = floodModel.getAffectedCctv(cctv, 12.0, 1.2);

  assert.deepEqual(result.affectedIds, ["cam-edge", "cam-low"]);
  assert.equal(result.total, 3);
  assert.equal(result.affected, 2);
});

test("getVisibleFloodBands returns only polygons reached by current level", () => {
  const bands = [
    { id: "band-01", minLevel: 0 },
    { id: "band-02", minLevel: 1.5 },
    { id: "band-03", minLevel: 3.0 },
  ];

  const visible = floodModel.getVisibleFloodBands(bands, 1.8);

  assert.deepEqual(
    visible.map((band) => band.id),
    ["band-01", "band-02"],
  );
});

test("getBlockedRoads returns roads interrupted by water level", () => {
  const roads = [
    { id: "road-safe", minLevel: 4.5 },
    { id: "road-warning", minLevel: 2.5 },
    { id: "road-critical", minLevel: 1.2 },
  ];

  const result = floodModel.getBlockedRoads(roads, 2.8);

  assert.deepEqual(result.blockedIds, ["road-warning", "road-critical"]);
  assert.equal(result.total, 3);
  assert.equal(result.blocked, 2);
});

test("getImpactForecast produces urgent text as water approaches max level", () => {
  const forecast = floodModel.getImpactForecast(4.4, { min: 0, max: 5 });

  assert.equal(forecast.severity, "critical");
  assert.equal(forecast.minutes, 4);
  assert.match(forecast.message, /4 分鐘後/);
});
