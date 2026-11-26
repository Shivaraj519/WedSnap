@echo off
echo ===================================================
echo Starting WedSnap Backend (FastAPI)...
echo ===================================================
cd /d "%~dp0backend"
.\venv\Scripts\python.exe run.py
pause
