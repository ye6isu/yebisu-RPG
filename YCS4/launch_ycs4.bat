@echo off
setlocal

pushd "%~dp0" || (
    echo Failed to open the YCS4 directory: %~dp0
    pause
    exit /b 1
)

set "CARGO_EXE="
for /f "delims=" %%I in ('where cargo.exe 2^>nul') do if not defined CARGO_EXE set "CARGO_EXE=%%I"
if not defined CARGO_EXE if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "CARGO_EXE=%USERPROFILE%\.cargo\bin\cargo.exe"
if defined CARGO_HOME if not defined CARGO_EXE if exist "%CARGO_HOME%\bin\cargo.exe" set "CARGO_EXE=%CARGO_HOME%\bin\cargo.exe"

if not defined CARGO_EXE (
    echo Rust and Cargo are required to launch YCS4.
    echo Install Rust from https://rustup.rs/ and try again.
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
if not defined NODE_EXE if exist "D:\Programs\nodejs\node.exe" set "NODE_EXE=D:\Programs\nodejs\node.exe"

if not defined NODE_EXE (
    echo Node.js is required to launch YCS4.
    echo Install the current Node.js LTS release and try again.
    goto :failed
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "NPM_CMD="
if exist "%NODE_DIR%npm.cmd" set "NPM_CMD=%NODE_DIR%npm.cmd"
if not defined NPM_CMD for /f "delims=" %%I in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%I"

if not defined NPM_CMD (
    echo npm.cmd was not found beside Node.js or on PATH.
    goto :failed
)

set "PATH=%NODE_DIR%;%CARGO_DIR%;%PATH%"

set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VS_INSTALL="
if exist "%VSWHERE%" (
    for /f "usebackq delims=" %%I in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
        if not defined VS_INSTALL set "VS_INSTALL=%%I"
    )
)
if defined VS_INSTALL if exist "%VS_INSTALL%\VC\Auxiliary\Build\vcvars64.bat" (
    call "%VS_INSTALL%\VC\Auxiliary\Build\vcvars64.bat" >nul
    if errorlevel 1 goto :failed
)

if not exist "node_modules\" (
    echo Installing YCS4 dependencies...
    call "%NPM_CMD%" install
    if errorlevel 1 goto :failed
)

echo Launching YCS4...
call "%NPM_CMD%" run tauri dev
set "YCS4_EXIT_CODE=%errorlevel%"
if not "%YCS4_EXIT_CODE%"=="0" (
    echo YCS4 exited with error code %YCS4_EXIT_CODE%.
    pause
)

popd
exit /b %YCS4_EXIT_CODE%

:failed
echo YCS4 could not be launched.
pause
popd
exit /b 1
