# cesiumStage

CesiumJS disaster 3D MVP for flood level display, CCTV impact highlighting, and debris-flow potential overlays.

## Run

```powershell
cd D:\mytools\cesiumStage
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Current MVP

- Cesium 1.120 loaded from FocusIT CDN.
- Static browser-global app, no bundler and no framework.
- Flood level slider renders animated water polygons.
- Shock demo mode adds automatic water-level rise, foam outlines, alert banner, CCTV pulse rings, and road interruption glow.
- CCTV points switch color when their elevation is below the simulated water level plus safety buffer.
- Demo road segments turn red when the water level reaches their interruption threshold.
- Local same-origin NLSC EMAP basemap is used to avoid WebGL texture restrictions on cross-origin tiles.
- Debris-flow potential areas and streams are loaded from generated JS globals.
- Demo debris-flow paths render glowing flow lines and animated mud particles when the scenario reaches each threshold.

## Cesium CDN

```text
https://3dmap.focusit.com.tw/easymap_data/Cesium-1.120/build/Cesium/
```

The page sets `window.CESIUM_BASE_URL` before loading `Cesium.js`, so Cesium widgets, workers, and water normal textures resolve from the same CDN.

## Debris Data

Source files expected in project root:

```text
debris1753_20260126_twd97.zip
debrisstream1753_20260126_twd97.zip
```

Convert with:

```powershell
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\convert-debris-data.ps1
```

The script uses:

```text
C:\ms4w_MSSQL\GDAL\ogr2ogr.exe
```

Generated outputs:

```text
assets\data\debris-areas.js
assets\data\debris-streams.js
assets\data\debris-areas.geojson
assets\data\debris-streams.geojson
```

## Local Basemap

Build the same-origin demo basemap with:

```powershell
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\build-local-basemap.ps1
```

Generated output:

```text
assets\images\demo-basemap.png
```

## Verify

```powershell
node --test tests\*.test.js
git status --short --branch
```

## Next

- Replace demo flood bands with DEM-derived raster or polygon masks.
- Add quantized-mesh terrain tiles from GeoTIFF / ASC / GRD.
- Add time-series water level animation.
- Add debris-flow path animation based on slope, flow direction, and rainfall threshold.
