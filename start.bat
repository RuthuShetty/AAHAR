@echo off
setlocal enabledelayedexpansion
title AAHAR Agritech Platform Launcher

echo ===============================================================================
echo                AAHAR: AI-Assisted Health ^& Analysis of Ration
echo       Enterprise Smart NIR Feed Quality ^& Silage Spoilage Monitoring
echo ===============================================================================
echo.

:: 1. Navigate to target repository root directory
cd /d "%~dp0"
if exist "aahar-hardened\aahar\dashboard" (
    cd "aahar-hardened\aahar"
) else if exist "dashboard" (
    rem Already in target repository directory
) else if exist "aahar\dashboard" (
    cd "aahar"
)

echo [INFO] Working root: %CD%
echo.

:: 2. Check Python Installation
echo [STEP 1/5] Checking Python environment...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in system PATH!
    echo         Please install Python 3.10+ from https://www.python.org/
    echo         Ensure "Add Python to PATH" is checked during installation.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do set PYTHON_VER=%%v
echo [OK] Found %PYTHON_VER%

:: 3. Check Node.js and npm Installation
echo [STEP 2/5] Checking Node.js and npm environment...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in system PATH!
    echo         Please install Node.js 18+ LTS from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>^&1') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm --version 2^>^&1') do set NPM_VER=%%v
echo [OK] Found Node.js %NODE_VER% and npm %NPM_VER%
echo.

:: 4. Verify / Install Python Backend Dependencies
echo [STEP 3/5] Verifying Python backend dependencies...
python -c "import uvicorn, fastapi, pydantic, sqlalchemy" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing required Python packages...
    python -m pip install --quiet uvicorn fastapi pydantic pydantic-settings sqlalchemy httpx
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Pip install encountered an issue, proceeding with system packages...
    ) else (
        echo [OK] Python dependencies installed successfully.
    )
) else (
    echo [OK] Python backend dependencies are ready.
)
echo.

:: 5. Verify / Install Monorepo & Dashboard Dependencies
echo [STEP 4/5] Verifying Web Dashboard and Monorepo dependencies...
if not exist "node_modules\react-router-dom" (
    if not exist "dashboard\node_modules\react-router-dom" (
        echo [INFO] Installing monorepo dependencies - first time setup, please wait...
        call npm install
        echo [OK] Dependencies installed.
    ) else (
        echo [OK] Web Dashboard dependencies verified.
    )
) else (
    echo [OK] Web Dashboard dependencies verified.
)

:: Validate contracts codegen if script present
if exist "contracts\codegen\gen_ts.mjs" (
    echo [INFO] Validating zero-drift contracts codegen...
    node contracts\codegen\gen_ts.mjs >nul 2>&1
)
echo.

:: 6. Launch Platform Services
echo [STEP 5/5] Launching AAHAR Platform Services...
echo.
echo -------------------------------------------------------------------------------
echo   Service             URL                              Purpose
echo -------------------------------------------------------------------------------
echo   Web Intelligence    http://localhost:5173            React 18 + React Router v7
echo   Cloud Core API      http://127.0.0.1:8000            FastAPI + TimescaleDB/SQLite
echo   API Interactive Docs http://127.0.0.1:8000/docs       Swagger UI API Explorer
echo   API Health Probe    http://127.0.0.1:8000/health     Real-time Latency Probe
echo -------------------------------------------------------------------------------
echo.

:: Start Cloud Core API in a separate terminal window
echo [STARTING] Launching Cloud Core API server on port 8000...
start "AAHAR Cloud Core API (Port 8000)" cmd /k "python -m uvicorn cloud.app.main:app --host 127.0.0.1 --port 8000"

:: Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

:: Start Vite Web Dashboard in a separate terminal window
echo [STARTING] Launching Web Intelligence Dashboard on port 5173...
start "AAHAR Web Dashboard (Port 5173)" cmd /k "cd dashboard && npm run dev"

:: Wait 3 seconds for Vite dev server to bind port
timeout /t 3 /nobreak >nul

:: Open default browser to the Dashboard
echo [INFO] Opening default browser to http://localhost:5173 ...
start http://localhost:5173

echo.
echo ===============================================================================
echo   AAHAR Platform is RUNNING!
echo.
echo   Available Routes:
echo     - /fleet        : Fleet ^& Consignment Tracking Center
echo     - /traceability : Batch Traceability ^& Dispute Desk
echo     - /bunker       : 3D Silage Bunker Digital Twin
echo     - /suppliers    : Supplier Quality Scorecards
echo     - /models       : NIR Chemometric Model Health
echo     - /alerts       : Real-time Alert Console
echo     - /profile      : Inspector Profile ^& Hardware Tokens
echo     - /settings     : Platform Settings ^& Diagnostics
echo.
echo   Keep this window open or close it when done.
echo   To stop all services, close the spawned API and Dashboard command windows.
echo ===============================================================================
echo.
pause
