@echo off
setlocal
cd /d "%~dp0"

call :resolve_python
if errorlevel 1 exit /b 1

if not exist "wsgi.py" (
  echo wsgi.py was not found in the project root.
  echo Run this script from the Reversi project root.
  exit /b 1
)

%PYTHON_CMD% -c "import flask, waitress" >nul 2>nul
if errorlevel 1 (
  echo Required dependencies were not found.
  echo Run install_requirements.bat first, then try again.
  exit /b 1
)

echo Starting Reversi on http://127.0.0.1:5000/
echo A separate server window will stay open while the app is running.

start "Reversi Server" /D "%~dp0" cmd /k %PYTHON_CMD% -m waitress --listen=127.0.0.1:5000 wsgi:app

timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5000/"

echo.
echo The browser should open automatically.
echo Close the "Reversi Server" window to stop the local server.
exit /b 0

:resolve_python
where py >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=py -3"
  exit /b 0
)

where python >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=python"
  exit /b 0
)

echo Python 3 was not found in PATH.
echo Install Python 3 and enable "Add Python to PATH", then run this script again.
exit /b 1
