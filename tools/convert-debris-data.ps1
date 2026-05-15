param(
  [string]$GdalDir = "C:\ms4w_MSSQL\GDAL",
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$ogr2ogr = Join-Path $GdalDir "ogr2ogr.exe"
if (-not (Test-Path -LiteralPath $ogr2ogr)) {
  throw "找不到 ogr2ogr.exe: $ogr2ogr"
}

$dataDir = Join-Path $ProjectRoot "assets\data"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

function Convert-DebrisLayer {
  param(
    [string]$ZipName,
    [string]$ShpName,
    [string]$OutputName,
    [string]$GlobalName,
    [string]$GeometryType
  )

  $zipPath = Join-Path $ProjectRoot $ZipName
  if (-not (Test-Path -LiteralPath $zipPath)) {
    throw "找不到資料來源: $zipPath"
  }

  $source = "/vsizip/$($zipPath.Replace('\', '/'))/$ShpName"
  $geoJsonPath = Join-Path $dataDir "$OutputName.geojson"
  $jsPath = Join-Path $dataDir "$OutputName.js"

  if (Test-Path -LiteralPath $geoJsonPath) {
    Remove-Item -LiteralPath $geoJsonPath -Force
  }

  # 先在 TWD97 座標簡化幾何，再轉 WGS84；第一版重視瀏覽器展示效能。
  & $ogr2ogr `
    -f GeoJSON `
    -t_srs EPSG:4326 `
    -simplify 8 `
    -lco RFC7946=YES `
    $geoJsonPath `
    $source

  if ($LASTEXITCODE -ne 0) {
    throw "ogr2ogr 轉換失敗: $ZipName"
  }

  $geoJson = [System.IO.File]::ReadAllText($geoJsonPath, [System.Text.Encoding]::UTF8)
  $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
  $js = @(
    "/* 由 tools/convert-debris-data.ps1 於 $stamp 產生；來源：$ZipName；幾何：$GeometryType。 */"
    "window.$GlobalName = $geoJson;"
    ""
  ) -join "`n"

  [System.IO.File]::WriteAllText($jsPath, $js, [System.Text.Encoding]::UTF8)
}

Convert-DebrisLayer `
  -ZipName "debris1753_20260126_twd97.zip" `
  -ShpName "debris1753_20260126_twd97.shp" `
  -OutputName "debris-areas" `
  -GlobalName "CESIUM_STAGE_DEBRIS_AREAS" `
  -GeometryType "Polygon"

Convert-DebrisLayer `
  -ZipName "debrisstream1753_20260126_twd97.zip" `
  -ShpName "debrisstream1753_20260126_twd97.shp" `
  -OutputName "debris-streams" `
  -GlobalName "CESIUM_STAGE_DEBRIS_STREAMS" `
  -GeometryType "LineString"

Write-Host "Debris data converted to $dataDir"
