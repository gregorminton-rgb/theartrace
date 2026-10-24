@echo off
REM The Great Art Race - dev server
REM Zero-dependency: serves this folder so the prototype and its scripts load
REM correctly (some browsers block file:// for module-style loading).
REM Usage:  serve.cmd [port]        default port 8080
setlocal
if "%~1"=="" (set PORT=8080) else (set PORT=%~1)
pushd "%~dp0"
echo Serving TheArtRaceWeb at http://localhost:%PORT%  (Ctrl+C to stop)
start "" "http://localhost:%PORT%/"
python -m http.server %PORT% --bind 127.0.0.1
popd
