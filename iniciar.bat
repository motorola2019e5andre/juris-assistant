@echo off
title Juris Assistant Server
echo ========================================
echo   JURIS ASSISTANT - Servidor Local
echo ========================================
echo.
cd /d "F:\juris-assistant\apps\api"
echo Instalando dependencias...
npm install
echo.
echo Iniciando servidor...
npx tsx src\server.ts
pause