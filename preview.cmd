@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   本地预览启动中...
echo   地址    http://127.0.0.1:1313/
echo   说明    写完文章存盘，页面会自动刷新
echo   停止    关闭任务栏里那个最小化的 "Hugo Preview" 窗口
echo.

if not exist "tools\hugo\hugo.exe" (
    echo   [错误] 找不到 tools\hugo\hugo.exe
    echo   请把 Hugo 解压到 tools\hugo\ 目录下，或改用命令行方式启动。
    echo.
    pause
    exit /b 1
)

start "Hugo Preview" /min tools\hugo\hugo.exe server --bind 127.0.0.1 --port 1313 --disableFastRender
timeout /t 4 >nul
start "" http://127.0.0.1:1313/

echo   预览已在后台运行。此窗口可直接关闭。
echo.
pause
