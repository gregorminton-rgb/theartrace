# The Great Art Race - dev server
# Zero-dependency alternative to `python -m http.server` so the prototype can
# be opened with one click. Usage:  serve.cmd [port]
@echo off
setlocal
if "%~1"=="" (set PORT=8080) else (set PORT=%~1)
echo Serving TheArtRaceWeb at http://localhost:%PORT%  (Ctrl+C to stop)
python -m http.server %PORT% --directory "%~dp0"