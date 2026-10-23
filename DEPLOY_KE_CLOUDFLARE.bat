@echo off
title Deploy FinanceFlow ke Cloudflare Pages
color 0B
cd /d "%~dp0"

echo ========================================================
echo        UPDATE DEPLOY FINANCEFLOW KE CLOUDFLARE PAGES
echo ========================================================
echo.
echo Sedang mengompilasi dan mengunggah ke Cloudflare Pages...
echo.

call npm.cmd run build
call npx.cmd wrangler pages deploy dist --project-name financeflow-pwa

echo.
echo ========================================================
echo Deploy berhasil! Aplikasi Anda aktif di Cloudflare Pages:
echo https://financeflow-pwa.pages.dev
echo ========================================================
pause
