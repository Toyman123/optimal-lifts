@echo off
setlocal enabledelayedexpansion
rem OptimalLifts launcher. Double-click me.
rem Builds the app, frees the port if an old server is still holding it,
rem starts fresh, opens it here, and prints the address for your phone.
rem Keep the minimized "OptimalLifts server" window open while you use the app.
cd /d "%~dp0"

set PORT=3000

echo.
echo   Stopping any old OptimalLifts server...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo   Building OptimalLifts...
echo.
call npm run build
if errorlevel 1 goto fail

rem This machine's address on the local network, for phone access.
set LANIP=
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } ^| Select-Object -First 1 -ExpandProperty IPAddress)"') do set LANIP=%%i
if "%LANIP%"=="" set LANIP=your-computer-ip

start "OptimalLifts server" /min cmd /c "npx next start -H 0.0.0.0 -p %PORT%"

echo   Starting server...
set TRIES=0
:wait
set /a TRIES+=1
if %TRIES% GTR 40 goto nostart
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:%PORT%/ -TimeoutSec 2; if ($r.Content -match 'OptimalLifts') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 goto wait

start "" http://localhost:%PORT%/

echo.
echo   ------------------------------------------------
echo    OptimalLifts is running.
echo.
echo    On this laptop:  http://localhost:%PORT%
echo    On your phone:   http://%LANIP%:%PORT%
echo.
echo    On the phone, use Share - Add to Home Screen
echo    to install it like an app.
echo   ------------------------------------------------
echo.
echo   Closing the minimized server window stops the app.
echo.
pause
exit /b 0

:nostart
echo.
echo   The server did not come up after 40 seconds.
echo   Check the minimized "OptimalLifts server" window for the reason.
echo.
pause
exit /b 1

:fail
echo.
echo   Build failed. See the messages above.
echo.
pause
exit /b 1
