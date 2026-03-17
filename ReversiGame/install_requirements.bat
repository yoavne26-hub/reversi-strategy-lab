@echo off
setlocal
cd /d "%~dp0"

call :resolve_python
if errorlevel 1 exit /b 1

if not exist "requirements.txt" (
  echo requirements.txt was not found in the project root.
  exit /b 1
)

echo Installing Python dependencies from requirements.txt...
%PYTHON_CMD% -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo Dependency installation failed.
  echo Make sure Python and pip are available, then try again.
  exit /b 1
)

echo.
echo Dependencies installed successfully.
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
