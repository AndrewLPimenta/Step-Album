@echo off
setlocal enabledelayedexpansion
title StepAlbum - gerar o app desktop
cd /d "%~dp0"

echo ==========================================================
echo   StepAlbum  ^|  gerar o aplicativo de desktop (Windows)
echo ==========================================================
echo.
echo Este script vai:
echo   1. conferir Node.js, Rust e as build tools do Visual Studio
echo   2. completar as dependencias (npm install)
echo   3. compilar o app com o Tauri
echo   4. abrir a pasta com o instalador gerado
echo.
echo O primeiro build demora de 10 a 20 minutos. Os proximos sao rapidos.
echo.
pause

REM ----------------------------------------------------------------- Node
echo.
echo [1/4] Conferindo Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   ERRO: Node.js nao encontrado no PATH.
  echo   Instale em https://nodejs.org  ^(versao LTS^) e rode este .bat de novo.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node --version') do echo   Node %%v  OK

REM ----------------------------------------------------------------- Rust
echo.
echo [2/4] Conferindo Rust...
where cargo >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Rust nao encontrado. Ele e' obrigatorio para compilar o app.
  echo.
  echo   Vou instalar via winget:  winget install Rustlang.Rustup
  echo   ^(baixa cerca de 300 MB; as build tools do MSVC vem depois^)
  echo.
  choice /c SN /m "   Instalar o Rust agora"
  if errorlevel 2 (
    echo.
    echo   Cancelado. Instale manualmente em https://rustup.rs e rode de novo.
    pause
    exit /b 1
  )
  winget install --id Rustlang.Rustup -e --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo.
    echo   A instalacao pelo winget falhou. Baixe o rustup-init.exe
    echo   em https://rustup.rs e instale manualmente.
    pause
    exit /b 1
  )
  echo.
  echo   ==========================================================
  echo   Rust instalado. FECHE esta janela e rode o .bat de novo,
  echo   para o Windows enxergar o cargo no PATH.
  echo   ==========================================================
  pause
  exit /b 0
)
for /f "delims=" %%v in ('cargo --version') do echo   %%v  OK

REM ------------------------------------------------- build tools do MSVC
echo.
echo   Conferindo as ferramentas C++ do Visual Studio...

set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "TEMVC="
if exist "%VSWHERE%" (
  for /f "usebackq delims=" %%i in (`"%VSWHERE%" -latest -products * ^
      -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 ^
      -property installationPath 2^>nul`) do set "TEMVC=%%i"
)

if not defined TEMVC (
  echo.
  echo   ==========================================================
  echo   FALTA o compilador C++ do Visual Studio.
  echo.
  echo   Voce tem o Visual Studio instalado, mas SEM o workload
  echo   "Desenvolvimento para desktop com C++". Sem ele nao existe
  echo   o link.exe, e o Rust nao consegue gerar nenhum executavel
  echo   — foi exatamente por isso que o build parou antes.
  echo   ==========================================================
  echo.
  echo   Duas formas de resolver:
  echo.
  echo     [1] Eu instalo agora as Build Tools via winget
  echo         ^(download de 2 a 4 GB, pede permissao de administrador^)
  echo.
  echo     [2] Voce mesmo, pelo Visual Studio Installer que ja tem:
  echo         abrir  ^>  Modificar  ^>  marcar
  echo         "Desenvolvimento para desktop com C++"  ^>  Modificar
  echo         ^(reaproveita o que ja esta baixado, costuma ser menor^)
  echo.
  choice /c 12S /m "   Escolha 1, 2 ou S para sair"
  if errorlevel 3 (
    echo   Saindo. Rode este .bat de novo depois de instalar o C++.
    pause
    exit /b 1
  )
  if errorlevel 2 (
    echo.
    echo   Abrindo o Visual Studio Installer...
    start "" "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\setup.exe"
    echo.
    echo   Marque "Desenvolvimento para desktop com C++", clique em
    echo   Modificar, espere terminar e rode este .bat de novo.
    pause
    exit /b 0
  )

  echo.
  echo   Instalando as Build Tools... isso demora bastante.
  winget install --id Microsoft.VisualStudio.2022.BuildTools -e ^
    --accept-package-agreements --accept-source-agreements ^
    --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.Windows11SDK.22621 --includeRecommended"
  if errorlevel 1 (
    echo.
    echo   A instalacao falhou. Tente a opcao 2 ^(Visual Studio Installer^).
    pause
    exit /b 1
  )
  echo.
  echo   ==========================================================
  echo   Build Tools instaladas. FECHE esta janela e rode o .bat
  echo   de novo para o ambiente ser recarregado.
  echo   ==========================================================
  pause
  exit /b 0
) else (
  echo   C++ encontrado em: !TEMVC!  OK
)

REM ----------------------------------------------------------- npm install
echo.
echo [3/4] Instalando as dependencias do projeto...
echo   ^(o @tauri-apps/cli esta faltando no node_modules atual^)
echo.
call npm install
if errorlevel 1 (
  echo.
  echo   ERRO no npm install. Veja a mensagem acima.
  pause
  exit /b 1
)
echo   dependencias OK

REM ------------------------------------------------------------ tauri build
echo.
echo [4/4] Compilando o app... isso demora, pode deixar rodando.
echo.
call npm run desktop:build
if errorlevel 1 (
  echo.
  echo   ==========================================================
  echo   O build falhou. Role a tela para cima e procure a primeira
  echo   linha que comeca com "error:".
  echo.
  echo     - "linker `link.exe` not found"  ^> falta o workload C++
  echo     - "failed to run custom build command" ^> idem, quase sempre
  echo     - erro de rede ao baixar crates ^> so' rodar de novo
  echo   ==========================================================
  pause
  exit /b 1
)

REM --------------------------------------------------------------- resultado
set "SAIDA=%~dp0src-tauri\target\release\bundle"
echo.
echo ==========================================================
echo   PRONTO
echo ==========================================================
echo.
echo   Instalador gerado em:
echo   %SAIDA%
echo.
echo   Procure o .msi em  msi\   ou o .exe em  nsis\
echo   Rode o instalador e o StepAlbum aparece no menu Iniciar.
echo.
if exist "%SAIDA%" (
  start "" explorer "%SAIDA%"
) else (
  echo   AVISO: a pasta de saida nao foi encontrada.
  echo   Procure por .msi dentro de src-tauri\target\release\
)
echo.
pause
