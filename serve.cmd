@echo off
REM Tannscribe is a Vite app now. This runs the dev server and opens it.
REM For a production build, run: npm run build  (output goes to dist/)
cd /d "%~dp0"
start "Tannscribe dev" cmd /c "npm run dev"
timeout /t 3 >nul
start "" http://localhost:5173/
