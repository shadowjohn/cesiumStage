param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "..\assets\data\taichung-buildings.js"),
  [string]$IdentityUrlTemplate = "https://3wa.tw/easymap_server/identity.php?mode=identity&wms_id=8&lon={lon}&lat={lat}&limit={limit}",
  [string[]]$Centers = @(
    "120.65500000,24.09900000",
    "120.66500000,24.08600000",
    "120.68400000,24.09700000",
    "120.68480000,24.12520000",
    "120.66588368,24.11933551",
    "120.65500000,24.10500000"
  ),
  [int]$Limit = 550,
  [int]$MaxFeatures = 1800
)

$ErrorActionPreference = "Stop"

function ConvertTo-Feature {
  param(
    [Parameter(Mandatory = $true)] $Row
  )

  [PSCustomObject]@{
    ogc_fid = [int]$Row.ogc_fid
    id = [int]$Row.id
    b1d = [int]$Row.b1d
    ORZ_LON = [double]$Row.ORZ_LON
    ORZ_LAT = [double]$Row.ORZ_LAT
    ORZ_DISTANCE = [double]$Row.ORZ_DISTANCE
    ORZ_WKT = [string]$Row.ORZ_WKT
  }
}

$featuresById = [ordered]@{}

foreach ($center in $Centers) {
  $parts = $center.Split(",", [System.StringSplitOptions]::RemoveEmptyEntries)
  if ($parts.Count -ne 2) {
    throw "Center 格式錯誤，請使用 lon,lat：$center"
  }

  $lon = $parts[0].Trim()
  $lat = $parts[1].Trim()
  $url = $IdentityUrlTemplate.Replace("{lon}", $lon).Replace("{lat}", $lat).Replace("{limit}", [string]$Limit)

  Write-Host "讀取台中建物 identity：$lon,$lat limit=$Limit"
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 60
  $payload = $response.Content | ConvertFrom-Json

  if ($payload.STATUS -ne "OK") {
    throw "identity 回傳非 OK：$($payload.STATUS)"
  }

  foreach ($row in $payload.DATA) {
    if (-not $row.ORZ_WKT -or -not $row.ogc_fid) {
      continue
    }

    $key = [string]$row.ogc_fid
    if (-not $featuresById.Contains($key)) {
      $featuresById[$key] = ConvertTo-Feature -Row $row
    }

    if ($featuresById.Count -ge $MaxFeatures) {
      break
    }
  }

  if ($featuresById.Count -ge $MaxFeatures) {
    break
  }
}

$features = @($featuresById.Values)
$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = [System.IO.Path]::GetDirectoryName($outputFullPath)

if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$data = [ordered]@{
  source = "https://3wa.tw/demo/htm/test_javascript.php?id=365"
  identityUrlTemplate = $IdentityUrlTemplate
  generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
  wms = [ordered]@{
    id = 8
    title = "臺中市建物圖(113年最新版)"
  }
  floorField = "b1d"
  wktField = "ORZ_WKT"
  featureCount = $features.Count
  features = $features
}

$json = $data | ConvertTo-Json -Depth 8 -Compress
$header = "/* 由 tools/build-taichung-buildings.ps1 產生；來源：Easymap id=365 / identity.php wms_id=8。 */"
$content = "$header`nwindow.CESIUM_STAGE_TAICHUNG_BUILDINGS = $json;`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputFullPath, $content, $utf8NoBom)

Write-Host "完成：$outputFullPath，共 $($features.Count) 筆建物。"
