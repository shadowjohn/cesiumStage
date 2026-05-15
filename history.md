# cesiumStage History

## 2026-05-16

- 建立 `cesiumStage` 初始 MVP。
- 使用 FocusIT Cesium 1.120 CDN，不使用 npm build。
- 建立水位 slider、淹水水面、CCTV 受影響高亮、道路中斷示範。
- 下載並拼接 NLSC EMAP 示範區底圖為同源 PNG，避免外部圖磚 CORS 造成 WebGL 黑底。
- 使用 `C:\ms4w_MSSQL\GDAL\ogr2ogr.exe` 將土石流潛勢區與潛勢溪流 zip 轉為 WGS84 GeoJSON / JS globals。
- Git remote 使用 `git@github.com:shadowjohn/cesiumStage.git`。

## 延續事項

- 真實 DEM / DTM 轉 quantized-mesh terrain。
- 淹水 polygon / raster mask 由 DEM 與水位計算產生。
- 土石流 slope、flow direction、flow accumulation 與 rainfall threshold 模型。
- CCTV / 道路 / 建物資料改接真實服務或既有 GIS 圖層。
