const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

test("index loads Cesium from the FocusIT CDN and project globals in order", () => {
  const html = readProjectFile("index.html");

  assert.match(
    html,
    /https:\/\/3dmap\.focusit\.com\.tw\/easymap_data\/Cesium-1\.120\/build\/Cesium\/Widgets\/widgets\.css/,
  );
  assert.match(
    html,
    /https:\/\/3dmap\.focusit\.com\.tw\/easymap_data\/Cesium-1\.120\/build\/Cesium\/Cesium\.js/,
  );
  assert.ok(html.indexOf("assets/js/config.js") < html.indexOf("Cesium.js"));
  assert.ok(html.indexOf("assets/js/sample-data.js") < html.indexOf("assets/js/app.js"));
});

test("app code avoids blocked browser request and popup APIs", () => {
  const files = [
    "assets/js/app.js",
    "assets/js/config.js",
    "assets/js/sample-data.js",
    "assets/js/flood-model.js",
    "assets/js/building-model.js",
    "assets/data/taichung-buildings.js",
  ];

  const combined = files.map(readProjectFile).join("\n");

  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /\bXMLHttpRequest\b/);
  assert.doesNotMatch(combined, /\balert\s*\(/);
});

test("debris layers are packaged as browser globals", () => {
  const areas = readProjectFile("assets/data/debris-areas.js");
  const streams = readProjectFile("assets/data/debris-streams.js");

  assert.match(areas, /window\.CESIUM_STAGE_DEBRIS_AREAS\s*=/);
  assert.match(streams, /window\.CESIUM_STAGE_DEBRIS_STREAMS\s*=/);
});

test("Taichung building overlay is packaged as a static browser global", () => {
  const html = readProjectFile("index.html");
  const config = readProjectFile("assets/js/config.js");
  const app = readProjectFile("assets/js/app.js");
  const dataPath = path.join(root, "assets/data/taichung-buildings.js");
  const data = readProjectFile("assets/data/taichung-buildings.js");

  assert.ok(html.indexOf("assets/data/taichung-buildings.js") < html.indexOf("assets/js/app.js"));
  assert.match(html, /id="toggleBuildings"/);
  assert.match(html, /id="buildingFloodCount"/);
  assert.match(config, /identity\.php\?mode=identity&wms_id=8/);
  assert.match(config, /floorHeight:\s*3\.5/);
  assert.match(app, /addTaichungBuildings/);
  assert.match(app, /CESIUM_STAGE_TAICHUNG_BUILDINGS/);
  assert.match(app, /extrudedHeight/);
  assert.match(data, /window\.CESIUM_STAGE_TAICHUNG_BUILDINGS\s*=/);
  assert.ok(fs.statSync(dataPath).size > 10000);
});

test("multiple downstream flood scenarios are selectable", () => {
  const html = readProjectFile("index.html");
  const sampleData = readProjectFile("assets/js/sample-data.js");
  const app = readProjectFile("assets/js/app.js");
  const config = readProjectFile("assets/js/config.js");

  assert.match(html, /id="scenarioSelect"/);
  assert.match(html, /id="scenarioHeightLabel"/);
  assert.match(sampleData, /floodScenarios/);
  assert.match(sampleData, /wuri-downstream/);
  assert.match(sampleData, /dali-downstream/);
  assert.match(sampleData, /taiping-outlet/);
  assert.match(sampleData, /nantun-urban/);
  assert.match(sampleData, /demBaseHeight/);
  assert.match(app, /populateScenarioSelect/);
  assert.match(app, /handleScenarioChange/);
  assert.match(app, /flyToScenario/);
  assert.match(app, /buildingFloodCollars/);
  assert.match(config, /demHeightApi/);
  assert.match(config, /Cesium\.Terrain\.fromWorldTerrain/);
});

test("local basemap is available as a same-origin image", () => {
  const config = readProjectFile("assets/js/config.js");
  const basemapPath = path.join(root, "assets/images/demo-basemap.png");

  assert.match(config, /localBasemap/);
  assert.ok(fs.statSync(basemapPath).size > 100000);
});

test("shock demo controls are present in the app shell", () => {
  const html = readProjectFile("index.html");
  const sampleData = readProjectFile("assets/js/sample-data.js");

  assert.match(html, /id="playScenario"/);
  assert.match(html, /id="alertBanner"/);
  assert.match(html, /id="impactHeadline"/);
  assert.match(sampleData, /debrisFlows/);
});

test("dark OSM basemap and readable label styling are configured", () => {
  const config = readProjectFile("assets/js/config.js");
  const app = readProjectFile("assets/js/app.js");
  const css = readProjectFile("assets/css/app.css");
  const basemapPath = path.join(root, "assets/images/dark-osm-basemap.png");

  assert.match(config, /dark-osm-basemap\.png/);
  assert.match(config, /basemaps\.cartocdn\.com\/dark_all/);
  assert.match(config, /useLiveTiles:\s*true/);
  assert.match(app, /UrlTemplateImageryProvider/);
  assert.match(app, /enablePickFeatures:\s*false/);
  assert.match(app, /font:\s*"700 18px/);
  assert.match(app, /outlineWidth:\s*5/);
  assert.match(css, /text-shadow:/);
  assert.ok(fs.statSync(basemapPath).size > 100000);
});
