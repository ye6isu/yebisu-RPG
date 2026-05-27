@echo off
title yebisu Content Studio
cd /d D:\Projects\Mods\yebisu-RPG\ycs

echo Starting backend...
start "ycs-backend" cmd /k "node server.js"

echo Waiting for backend...
timeout /t 2 /nobreak > nul

echo Starting frontend...
start "ycs-frontend" cmd /k "npm run dev"

echo Waiting for frontend...
timeout /t 3 /nobreak > nul

echo Opening browser...
start http://localhost:5173

echo.
echo yebisu Content Studio is running.
echo Close the two terminal windows to stop.
