Write-Host "Starting WedSnap Backend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
.\venv\Scripts\python.exe run.py
