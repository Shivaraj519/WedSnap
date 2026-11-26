@echo off
echo ===================================================
echo Launching WedSnap Platform (Backend + Frontend)...
echo ===================================================

start "WedSnap Backend (Port 8000)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe run.py"
start "WedSnap Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:5173/sophia-alexander
echo.
pause
