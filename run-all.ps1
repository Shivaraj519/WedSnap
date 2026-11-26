Write-Host "Launching WedSnap Backend and Frontend..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; .\venv\Scripts\python.exe run.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host "Started both servers!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Frontend:    http://localhost:5173/sophia-alexander" -ForegroundColor Yellow
