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
