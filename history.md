# cesiumStage History

## 2026-05-16

- 建立 `cesiumStage` 初始 MVP。
- 使用 FocusIT Cesium 1.120 CDN，不使用 npm build。
- 建立水位 slider、淹水水面、CCTV 受影響高亮、道路中斷示範。
- 下載並拼接 NLSC EMAP 示範區底圖為同源 PNG，避免外部圖磚 CORS 造成 WebGL 黑底。
- 使用 `C:\ms4w_MSSQL\GDAL\ogr2ogr.exe` 將土石流潛勢區與潛勢溪流 zip 轉為 WGS84 GeoJSON / JS globals。
- Git remote 使用 `git@github.com:shadowjohn/cesiumStage.git`。

## 2026-05-16 Shock Demo

- 增加自動升水播放、重置、警報 banner 與災情摘要列。
- 淹水面增加水紋、泡沫邊界與高水位 CRITICAL 顯示。
- CCTV 受影響時變紅並顯示脈動警戒圈，道路中斷改成發光紅線。
- 新增示範土石流流路與泥流粒子動畫，用於展示「山坡往下衝」的戰情效果。
- 依 3WA 暗色 OSM 範例改用 Carto `dark_all` tile，並拼成同源底圖避免 Cesium WebGL/CORS 問題。
- Carto `dark_all` 確認回傳 `Access-Control-Allow-Origin: *` 後，預設改成 Cesium live XYZ tile，保留同源 PNG 作 fallback。
- 提高 UI 與 Cesium label 字級、字重、描邊與文字陰影，強化暗色底圖上的可讀性。

## 2026-05-16 Taichung Buildings / Multi Scenario

- 參考 `https://3wa.tw/demo/htm/test_javascript.php?id=365`，改用離線產生的 `assets/data/taichung-buildings.js` 載入台中建物。
- 建物來源為 Easymap `identity.php?mode=identity&wms_id=8`，使用 `ORZ_WKT` 與 `b1d`，以每層 3.5m 拉 Cesium extruded polygon。
- 新增烏日下游、大里溪側坡出口、太平山腳匯流口、南屯都會建物邊 4 個淹水示範區，可從 UI 切換。
- 每個示範區配置 20M DEM 參考基準高、獨立淹水階段、CCTV、道路與相機位置。
- 淹水時建物會以藍色貼邊 collar 顯示水深，並統計受淹建物數。
- 參考 `https://3wa.tw/demo/php/map/taiwan_dem_height/`，確認 DEM 查詢需先轉 EPSG:3826 後呼叫 `api.php?mode=getDemHeight`。
- 檢查 `https://www.focusit.com.tw/easymap/easymap_cesium_terrain.html`，確認該範例使用 Cesium Ion `Cesium.Terrain.fromWorldTerrain({ requestWaterMask: true })` 與 `map.enable3DTerrain()`，不是本 repo 自轉 terrain。

## 延續事項

- 真實 DEM / DTM 轉 quantized-mesh terrain。
- 淹水 polygon / raster mask 由 DEM 與水位計算產生。
- 土石流 slope、flow direction、flow accumulation 與 rainfall threshold 模型。
- CCTV / 道路 / 建物資料改接真實服務或既有 GIS 圖層。
