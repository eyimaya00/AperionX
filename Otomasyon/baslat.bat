@echo off
chcp 65001 > nul
echo --------------------------------------------------
echo AperionX YouTube Shorts Otomasyonu Başlatılıyor...
echo --------------------------------------------------

echo [1/2] Backend (API) başlatılıyor...
start "AperionX Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo [2/2] Frontend (Arayüz) başlatılıyor...
start "AperionX Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ================================================================
echo Sistem başlatıldı! 
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:3001
echo.
echo Bu pencereyi kapatabilirsiniz, arka planda çalışmaya devam edecek.
echo Kapatmak için açılan iki siyah CMD penceresini kapatmanız gerekir.
echo ================================================================
timeout /t 5 > nul
