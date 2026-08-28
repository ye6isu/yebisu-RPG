@echo off
setlocal

rem Always run relative to this script, including when launched by a shortcut.
pushd "%~dp0" || (
    echo Failed to open the YCS directory: %~dp0
    pause
    exit /b 1
)

echo Checking YCS prerequisites...

set "CARGO_EXE="
for /f "delims=" %%I in ('where cargo.exe 2^>nul') do if not defined CARGO_EXE set "CARGO_EXE=%%I"
if not defined CARGO_EXE if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "CARGO_EXE=%USERPROFILE%\.cargo\bin\cargo.exe"
if defined CARGO_HOME if not defined CARGO_EXE if exist "%CARGO_HOME%\bin\cargo.exe" set "CARGO_EXE=%CARGO_HOME%\bin\cargo.exe"

if not defined CARGO_EXE (
    echo.
    echo ========================================================
    echo A usable Rust/Cargo installation was not found.
    echo Tauri requires Rust to build the native Windows window.
    echo Install Rust from https://rustup.rs/ and reopen this file.
    echo ========================================================
    goto :failed
)

for %%I in ("%CARGO_EXE%") do set "CARGO_DIR=%%~dpI"
set "CARGO=%CARGO_EXE%"
if exist "%CARGO_DIR%rustc.exe" set "RUSTC=%CARGO_DIR%rustc.exe"

set "NODE_EXE="
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
if not defined NODE_EXE (
    for /f "tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\Node.js" /v InstallPath 2^>nul ^| find /i "InstallPath"') do (
        if exist "%%Bnode.exe" set "NODE_EXE=%%Bnode.exe"
    )
)
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
    echo.
    echo ========================================================
    echo A usable Node.js installation was not found.
    echo Install the current Node.js LTS release from https://nodejs.org/
    echo and reopen this file after installation.
    echo ========================================================
    goto :failed
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "NPM_CMD="
if exist "%NODE_DIR%npm.cmd" set "NPM_CMD=%NODE_DIR%npm.cmd"
if not defined NPM_CMD (
    for /f "delims=" %%I in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%I"
)

if not defined NPM_CMD (
    echo.
    echo ========================================================
    echo npm.cmd was not found beside Node.js or on PATH.
    echo Repair or reinstall Node.js, then reopen this file.
    echo ========================================================
    goto :failed
)

rem Prepend verified directories to work around malformed system PATH entries.
set "PATH=%NODE_DIR%;%CARGO_DIR%;%PATH%"

rem Initialize the native x64 compiler environment when Build Tools is installed.
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VS_INSTALL="
if exist "%VSWHERE%" (
    for /f "usebackq delims=" %%I in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
        if not defined VS_INSTALL set "VS_INSTALL=%%I"
    )
)
if defined VS_INSTALL if exist "%VS_INSTALL%\VC\Auxiliary\Build\vcvars64.bat" (
    call "%VS_INSTALL%\VC\Auxiliary\Build\vcvars64.bat" >nul
    if errorlevel 1 (
        echo Failed to initialize the Visual Studio C++ build environment.
        goto :failed
    )
)

if not exist "package.json" (
    echo package.json was not found in %CD%.
    goto :failed
)

if not exist "node_modules\" (
    echo Installing Node dependencies...
    call "%NPM_CMD%" install
    if errorlevel 1 goto :failed
)

echo Launching YCS...
call "%NPM_CMD%" run tauri dev
set "YCS_EXIT_CODE=%errorlevel%"
if not "%YCS_EXIT_CODE%"=="0" (
    echo.
    echo YCS exited with error code %YCS_EXIT_CODE%.
    pause
)

popd
exit /b %YCS_EXIT_CODE%

:failed
echo.
echo YCS could not be launched.
pause
popd
exit /b 1
