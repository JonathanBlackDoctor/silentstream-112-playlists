Add-Type -AssemblyName System.Drawing
$artifactPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../artifacts'))
$labels = @('A  Quiet Sage', 'B  Warm Editorial', 'C  Midnight', 'D  Mono Studio')
$letters = @('a', 'b', 'c', 'd')
$tileWidth = 917
$tileHeight = 816
$gap = 30
$labelHeight = 54
$canvas = New-Object System.Drawing.Bitmap (($tileWidth * 2 + $gap * 3), (($tileHeight + $labelHeight) * 2 + $gap * 3))
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([System.Drawing.Color]::FromArgb(235,238,233))
$font = New-Object System.Drawing.Font 'Arial', 20, ([System.Drawing.FontStyle]::Regular)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35,43,37))
for ($i = 0; $i -lt 4; $i++) {
  $column = $i % 2
  $row = [Math]::Floor($i / 2)
  $x = $gap + $column * ($tileWidth + $gap)
  $y = $gap + $row * ($tileHeight + $labelHeight + $gap)
  $graphics.DrawString($labels[$i], $font, $brush, $x, ($y + 7))
  $image = [System.Drawing.Image]::FromFile((Join-Path $artifactPath ('design-' + $letters[$i] + '.jpg')))
  $graphics.DrawImage($image, $x, ($y + $labelHeight), $tileWidth, $tileHeight)
  $image.Dispose()
}
$outputFile = Join-Path $artifactPath 'design-comparison.jpg'
$canvas.Save($outputFile, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$graphics.Dispose()
$canvas.Dispose()
$font.Dispose()
$brush.Dispose()
Get-Item -LiteralPath $outputFile | Select-Object FullName, Length
