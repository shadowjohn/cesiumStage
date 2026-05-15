param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [int]$Zoom = 14,
  [int]$MinX = 13679,
  [int]$MaxX = 13687,
  [int]$MinY = 7058,
  [int]$MaxY = 7064
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$imageDir = Join-Path $ProjectRoot "assets\images"
$tileDir = Join-Path $ProjectRoot ".cache\emap-tiles"
New-Item -ItemType Directory -Force -Path $imageDir,$tileDir | Out-Null

$tileSize = 256
$cols = $MaxX - $MinX + 1
$rows = $MaxY - $MinY + 1
$outputPath = Join-Path $imageDir "demo-basemap.png"

$canvas = New-Object System.Drawing.Bitmap ($cols * $tileSize), ($rows * $tileSize)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([System.Drawing.Color]::White)

try {
  for ($y = $MinY; $y -le $MaxY; $y++) {
    for ($x = $MinX; $x -le $MaxX; $x++) {
      $tilePath = Join-Path $tileDir "$Zoom-$x-$y.jpg"
      $url = "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/$Zoom/$y/$x"

      if (-not (Test-Path -LiteralPath $tilePath)) {
        Invoke-WebRequest -Uri $url -OutFile $tilePath
      }

      $tile = [System.Drawing.Image]::FromFile($tilePath)
      try {
        $graphics.DrawImage($tile, ($x - $MinX) * $tileSize, ($y - $MinY) * $tileSize, $tileSize, $tileSize)
      }
      finally {
        $tile.Dispose()
      }
    }
  }

  # 轉成同源單張底圖，避免瀏覽器 WebGL 對外部圖磚的 CORS 限制。
  $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  $graphics.Dispose()
  $canvas.Dispose()
}

Write-Host "Local basemap written to $outputPath"
