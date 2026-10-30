@echo off
setlocal
cd /d "%~dp0"

where php >nul 2>nul
if errorlevel 1 (
  echo PHP wurde nicht gefunden. Installiere PHP 8.1 oder neuer und fuege php.exe zum PATH hinzu.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000' -TimeoutSec 1; if ($response.Content -notmatch 'coming-soon') { exit 1 } } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  start "WIDA ON PAPER - Lokaler Server" /min php -S 127.0.0.1:8000 router.php
  timeout /t 2 /nobreak >nul
)

powershell -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000' -TimeoutSec 3; if ($response.Content -notmatch 'coming-soon') { exit 1 } } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  echo Die Website konnte nicht gestartet werden. Pruefe, ob Port 8000 bereits belegt ist.
  pause
  exit /b 1
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
  echo Google Chrome wurde nicht gefunden.
  pause
  exit /b 1
)

start "" "%CHROME%" "http://localhost:8000"
