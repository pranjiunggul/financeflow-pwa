@echo off
title Deploy FinanceFlow ke Cloudflare Pages
color 0B
cd /d "%~dp0"

echo ========================================================
echo        DEPLOY FINANCEFLOW KE CLOUDFLARE PAGES
echo ========================================================
echo.
echo Sedang menyiapkan deploy ke Cloudflare Pages...
echo Browser Anda akan terbuka untuk verifikasi login akun Cloudflare.
echo.

call npm.cmd run build
call npx.cmd wrangler pages deploy dist --project-name financeflow-pwa

echo.
echo ========================================================
echo Deploy berhasil! Silakan salin URL .pages.dev yang muncul di atas.
echo ========================================================
pause
