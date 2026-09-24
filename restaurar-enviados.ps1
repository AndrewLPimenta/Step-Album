# ── Configuração ─────────────────────────────────────────────────────────────
$jaEnviados = "C:\Users\pimen\Desktop\kazz\ja enviados"
$enviados   = "C:\Users\pimen\Desktop\kazz\enviados"
$supabaseUrl = "https://mwwgnmhrzkdalkfpxcsu.supabase.co"
$apiKey      = "SUPABASE_SERVICE_ROLE_KEY"
$andrewId    = "96aa55dd-61d9-4a50-8b25-f00b71b77bcc"

$headers = @{
  "apikey"        = $apiKey
  "Authorization" = "Bearer $apiKey"
  "Content-Type"  = "application/json"
}

# ── Garante que enviados existe ───────────────────────────────────────────────
if (-not (Test-Path $enviados)) {
  New-Item -ItemType Directory -Path $enviados | Out-Null
  Write-Host "✓ Criada pasta: $enviados"
}

# ── Busca no Supabase: status enviado ou concluido, turmas 31066 e 31080 ──────
Write-Host "Consultando Supabase..."

$allAlbums = @()
foreach ($classPat in @('31066','31080')) {
  $from = 0
  do {
    $uri = "$supabaseUrl/rest/v1/albums" +
           "?select=student_code,class_code,status,student_name" +
           "&responsible_id=eq.$andrewId" +
           "&class_code=ilike.*$classPat*" +
           "&status=in.(enviado,concluido)" +
           "&limit=1000&offset=$from"
    $resp = Invoke-RestMethod -Uri $uri -Headers $headers -Method GET
    $allAlbums += $resp
    $from += $resp.Count
  } while ($resp.Count -eq 1000)
}

Write-Host "  $($allAlbums.Count) álbuns com status enviado/concluido encontrados no banco."

# Monta set de prefixos: ex "310660846", "310800604"
$prefixos = $allAlbums | ForEach-Object {
  $cc = $_.class_code -replace '[^0-9]','' | ForEach-Object { $_.Substring(0,[Math]::Min(5,$_.Length)) }
  $sc = $_.student_code.PadLeft(4,'0')
  "$cc$sc"
} | Sort-Object -Unique

Write-Host "  $($prefixos.Count) prefixos únicos para verificar."

# ── Varre ja enviados e move de volta os que têm prefixo enviado/concluido ────
$movidos  = [System.Collections.Generic.List[string]]::new()
$mantidos = 0

foreach ($dir in Get-ChildItem -Path $jaEnviados -Directory) {
  $matched = $false
  foreach ($pref in $prefixos) {
    if ($dir.Name -like "$pref*") {
      $matched = $true
      break
    }
  }

  if ($matched) {
    $alvo = Join-Path $enviados $dir.Name
    if (Test-Path $alvo) { $alvo = $alvo + "_dup" }
    Move-Item -Path $dir.FullName -Destination $alvo
    $movidos.Add($dir.Name)
  } else {
    $mantidos++
  }
}

# ── Relatório ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════"
Write-Host "RESTAURADOS → enviados ($($movidos.Count))"
Write-Host "══════════════════════════════════════════"
$movidos | ForEach-Object { Write-Host "  ✓ $_" }

Write-Host ""
Write-Host "  Mantidos em 'ja enviados': $mantidos"
Write-Host ""
Write-Host "✅ Concluído."
