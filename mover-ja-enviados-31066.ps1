# ── Configuração ─────────────────────────────────────────────────────────────
$raiz     = "C:\Users\pimen\Desktop\kazz"
$destino  = "C:\Users\pimen\Desktop\kazz\ja enviados"
$excluir  = "C:\Users\pimen\Desktop\kazz\fazendo\feitos"
$excluir2 = "C:\Users\pimen\Desktop\kazz\enviados"

# ── Student codes 31066 da lista fornecida ────────────────────────────────────
$codes = @(
  '0061','0075','0085','0124','0139',
  '0185','0186','0190','0192','0193','0196','0202','0203',
  '0702','0704','0705','0709','0710','0711','0715','0717','0720',
  '0723','0724','0728','0729','0730','0733','0735','0739','0740',
  '0747','0749','0750','0751','0753','0756','0762','0765',
  '0779','0788','0796','0797','0802','0803','0804','0820','0822','0823',
  '0827','0829','0835','0836','0841','0842','0846','0847','0850','0851',
  '0855','0859','0870','0877','0882','0884','0885',
  '0887','0888','0890','0900','0903','0907','0909','0910',
  '0917','0918','0920','0923','0941','0951','0981','0986','0997',
  '1001','1015','1018','1025','1035','1037','1041','1045','1047','1048',
  '1052','1053','1054','1055','1061','1062','1069','1071','1072','1073',
  '1074','1075','1076','1077','1079','1083',
  '1095','1106','1113','1131','1132','1133','1135','1136','1138',
  '1139','1142','1143','1147','1149','1150','1151','1154','1157','1158',
  '1160','1162','1165','1166','1167','1169','1171','1173','1174','1176',
  '1179','1181','1182','1185','1192','1199','1201','1211','1226','1231',
  '1232','1242','1244','1256','1257','1268','1283','1284','1287','1290',
  '1325','1337','1348','1351','1355','1358','1360','1363','1364','1365',
  '1368','1369','1372','1374','1376','1390',
  '1411','1413','1414','1415','1416','1426','1428','1430','1431',
  '1434','1435','1437','1441','1479','1521','1531','1541','1555',
  '1613','1615','1622','1623','1631','1634','1636','1638','1643',
  '1647','1663','1665','1685','1702','1708','1719','1729','1731',
  '1737','1740','1741','1742','1746','1754','1755','1756','1758','1762',
  '1785','1787','1789','1802','1805','1809','1810','1815','1817','1818',
  '1819','1821','1822','1824','1826','1832','1836','1838','1840','1841',
  '1844','1846','1848','1849','1852','1853','1856','1863','1864','1866',
  '1873','1875','1877','1878','1880','1881','1890','1896','1905',
  '9448','9533','9891','9987','9988'
) | Sort-Object -Unique

# ── Garante que o destino existe ──────────────────────────────────────────────
if (-not (Test-Path $destino)) {
  New-Item -ItemType Directory -Path $destino | Out-Null
  Write-Host "✓ Criada pasta: $destino"
}

# ── Busca e move ─────────────────────────────────────────────────────────────
$movidos  = [System.Collections.Generic.List[string]]::new()
$pulados  = [System.Collections.Generic.List[string]]::new()  # feitos
$naoAchados = [System.Collections.Generic.List[string]]::new()

foreach ($sc in $codes) {
  $prefix = "31066$sc"
  # Busca RECURSIVA em toda a raiz
  # Filtra só a pasta-raiz do álbum: o pai NÃO pode começar com "31066"
  # (evita pegar subpastas internas do kazz como 310660846_248632)
  $encontrados = Get-ChildItem -Path $raiz -Directory -Recurse |
    Where-Object {
      $_.Name -like "$prefix*" -and
      $_.Parent.Name -notmatch '^31066'
    }

  if ($encontrados.Count -eq 0) {
    $naoAchados.Add($sc)
    continue
  }

  foreach ($dir in $encontrados) {
    $fullPath = $dir.FullName

    # Pula pastas dentro de fazendo\feitos ou enviados
    if ($fullPath.StartsWith($excluir,  [System.StringComparison]::OrdinalIgnoreCase) -or
        $fullPath.StartsWith($excluir2, [System.StringComparison]::OrdinalIgnoreCase)) {
      $pulados.Add($dir.Name)
      continue
    }

    # Destino final
    $alvo = Join-Path $destino $dir.Name

    # Se já existir no destino, adiciona sufixo para não colidir
    if (Test-Path $alvo) {
      $alvo = $alvo + "_dup"
    }

    Move-Item -Path $fullPath -Destination $alvo
    $movidos.Add("$($dir.Name)  ←  $fullPath")
  }
}

# ── Relatório ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════"
Write-Host "MOVIDOS ($($movidos.Count))"
Write-Host "══════════════════════════════════════════"
$movidos | ForEach-Object { Write-Host "  ✓ $_" }

Write-Host ""
Write-Host "══════════════════════════════════════════"
Write-Host "PULADOS — estão em fazendo\feitos ($($pulados.Count))"
Write-Host "══════════════════════════════════════════"
$pulados | ForEach-Object { Write-Host "  ⏭ $_" }

Write-Host ""
Write-Host "══════════════════════════════════════════"
Write-Host "NÃO ENCONTRADOS NO DISCO ($($naoAchados.Count))"
Write-Host "══════════════════════════════════════════"
$naoAchados | ForEach-Object { Write-Host "  ✗ 31066:$_" }

Write-Host ""
Write-Host "✅ Concluído."
