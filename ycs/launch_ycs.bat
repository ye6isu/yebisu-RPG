@echo off
echo Checking for Rust (Cargo)...
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo ========================================================
    echo Rust is not installed! 
    echo Tauri requires Rust to build the native Windows window.
    echo Please install Rust from: https://rustup.rs/
    echo Once installed, restart your computer and run this again.
    echo ========================================================
    pause
    exit /b
)

echo Starting YCS Development Server...

if not exist node_modules (
    echo Installing Node dependencies...
    call npm install
)

echo Launching Tauri Window...
call npm run tauri dev
