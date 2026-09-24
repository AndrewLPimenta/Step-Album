# Move TUDO de "ja enviados" de volta para "enviados"
$jaEnviados = "C:\Users\pimen\Desktop\kazz\ja enviados"
$enviados   = "C:\Users\pimen\Desktop\kazz\enviados"

if (-not (Test-Path $enviados)) {
  New-Item -ItemType Directory -Path $enviados | Out-Null
}

$count = 0
foreach ($dir in Get-ChildItem -Path $jaEnviados -Directory) {
  $alvo = Join-Path $enviados $dir.Name
  if (Test-Path $alvo) { $alvo += "_dup" }
  Move-Item -LiteralPath $dir.FullName -Destination $alvo
  Write-Host "  ✓ $($dir.Name)"
  $count++
}

Write-Host ""
Write-Host "✅ $count pastas movidas para enviados."
