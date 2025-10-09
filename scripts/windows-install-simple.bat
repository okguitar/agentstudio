@echo off
REM Agent Studio Windows Installation Script (Simple Version)
REM This script provides a simplified installation process for Windows users

echo ╔══════════════════════════════════════════╗
echo ║       Agent Studio Windows Installer     ║
echo ║                                          ║
echo ║  This will guide you through installing: ║
echo ║  • Node.js (if needed)                  ║
echo ║  • Git (if needed)                      ║
echo ║  • Agent Studio Backend                 ║
echo ╚══════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo Please install Node.js 18 or later from: https://nodejs.org/
    echo After installation, restart this script.
    echo.
    pause
    exit /b 1
) else (
    echo [SUCCESS] Node.js is available
)

REM Check if Git is installed
echo [INFO] Checking Git installation...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed.
    echo.
    echo Please install Git from: https://git-scm.com/
    echo After installation, restart this script.
    echo.
    pause
    exit /b 1
) else (
    echo [SUCCESS] Git is available
)

REM Set installation directory
set INSTALL_DIR=%USERPROFILE%\.agent-studio
set SLIDES_DIR=%USERPROFILE%\slides
set TEMP_DIR=%TEMP%\agent-studio-install

echo [INFO] Installing Agent Studio to: %INSTALL_DIR%
echo.

REM Clean up existing installation
if exist "%INSTALL_DIR%" (
    echo [INFO] Cleaning existing installation...
    rmdir /s /q "%INSTALL_DIR%"
)

REM Create directories
echo [INFO] Creating directories...
mkdir "%INSTALL_DIR%" 2>nul
mkdir "%USERPROFILE%\.agent-studio-logs" 2>nul
mkdir "%USERPROFILE%\.agent-studio-config" 2>nul
mkdir "%SLIDES_DIR%" 2>nul

REM Clean up temp directory
if exist "%TEMP_DIR%" (
    rmdir /s /q "%TEMP_DIR%"
)
mkdir "%TEMP_DIR%"

REM Download Agent Studio
echo [INFO] Downloading Agent Studio...
cd /d "%TEMP_DIR%"
git clone https://github.com/git-men/agentstudio.git .
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download Agent Studio
    pause
    exit /b 1
)

echo [SUCCESS] Agent Studio downloaded successfully

REM Copy files
echo [INFO] Copying application files...
xcopy /e /i /h /y "%TEMP_DIR%\*" "%INSTALL_DIR%\"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy files
    pause
    exit /b 1
)

REM Install dependencies
echo [INFO] Installing dependencies...
cd /d "%INSTALL_DIR%"

REM Set CI environment variable
set CI=true

REM Check if pnpm is available
pnpm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Using pnpm for installation...
    pnpm install --prod
    if %errorlevel% neq 0 (
        echo [WARN] Production install failed, installing all dependencies...
        pnpm install
    )
    
    REM Try to build
    echo [INFO] Attempting to build backend...
    pnpm run build:backend >nul 2>&1
    if %errorlevel% equ 0 (
        echo [SUCCESS] Build successful
        set BUILD_SUCCESS=true
    ) else (
        echo [WARN] Build failed, will run in development mode
        set BUILD_SUCCESS=false
    )
) else (
    echo [INFO] Using npm for installation...
    npm install --production
    if %errorlevel% neq 0 (
        echo [WARN] Production install failed, installing all dependencies...
        npm install
    )
    
    REM Try to build
    echo [INFO] Attempting to build backend...
    npm run build:backend >nul 2>&1
    if %errorlevel% equ 0 (
        echo [SUCCESS] Build successful
        set BUILD_SUCCESS=true
    ) else (
        echo [WARN] Build failed, will run in development mode
        set BUILD_SUCCESS=false
    )
)

REM Create start script
echo [INFO] Creating start script...
if "%BUILD_SUCCESS%"=="true" (
    REM Production mode
    (
        echo @echo off
        echo echo 🚀 Starting Agent Studio Backend ^(Production Mode^)...
        echo cd /d "%INSTALL_DIR%"
        echo set NODE_ENV=production
        echo set PORT=4936
        echo set SLIDES_DIR=%SLIDES_DIR%
        echo echo 📂 Working directory: %%CD%%
        echo echo 🌐 Backend port: 4936
        echo echo 📑 Slides directory: %SLIDES_DIR%
        echo echo.
        echo echo ✨ Access the application at:
        echo echo    https://agentstudio-frontend.vercel.app/
        echo echo.
        echo echo 💡 Configure the backend URL in the web interface:
        echo echo    Settings → API Configuration → http://localhost:4936
        echo echo.
        echo node backend\dist\index.js
        echo pause
    ) > "%INSTALL_DIR%\start.bat"
) else (
    REM Development mode
    pnpm --version >nul 2>&1
    if %errorlevel% equ 0 (
        (
            echo @echo off
            echo echo 🚀 Starting Agent Studio Backend ^(Development Mode^)...
            echo cd /d "%INSTALL_DIR%"
            echo set NODE_ENV=development
            echo set PORT=4936
            echo set SLIDES_DIR=%SLIDES_DIR%
            echo echo 📂 Working directory: %%CD%%
            echo echo 🌐 Backend port: 4936
            echo echo 📑 Slides directory: %SLIDES_DIR%
            echo echo.
            echo echo ✨ Access the application at:
            echo echo    https://agentstudio-frontend.vercel.app/
            echo echo.
            echo echo 💡 Configure the backend URL in the web interface:
            echo echo    Settings → API Configuration → http://localhost:4936
            echo echo.
            echo pnpm run dev:backend
            echo pause
        ) > "%INSTALL_DIR%\start.bat"
    ) else (
        (
            echo @echo off
            echo echo 🚀 Starting Agent Studio Backend ^(Development Mode^)...
            echo cd /d "%INSTALL_DIR%"
            echo set NODE_ENV=development
            echo set PORT=4936
            echo set SLIDES_DIR=%SLIDES_DIR%
            echo echo 📂 Working directory: %%CD%%
            echo echo 🌐 Backend port: 4936
            echo echo 📑 Slides directory: %SLIDES_DIR%
            echo echo.
            echo echo ✨ Access the application at:
            echo echo    https://agentstudio-frontend.vercel.app/
            echo echo.
            echo echo 💡 Configure the backend URL in the web interface:
            echo echo    Settings → API Configuration → http://localhost:4936
            echo echo.
            echo npm run dev:backend
            echo pause
        ) > "%INSTALL_DIR%\start.bat"
    )
)

REM Create stop script
(
    echo @echo off
    echo echo 🛑 Stopping Agent Studio Backend...
    echo taskkill /f /im node.exe 2^>nul ^|^| echo No Node.js process running
    echo echo Backend stopped.
    echo pause
) > "%INSTALL_DIR%\stop.bat"

REM Create config file
(
    echo # Agent Studio 配置
    echo NODE_ENV=production
    echo PORT=4936
    echo SLIDES_DIR=%SLIDES_DIR%
    echo.
    echo # 可选: AI 提供商
    echo # OPENAI_API_KEY=your_key_here
    echo # ANTHROPIC_API_KEY=your_key_here
) > "%USERPROFILE%\.agent-studio-config\config.env"

REM Clean up temp files
echo [INFO] Cleaning up temporary files...
rmdir /s /q "%TEMP_DIR%" 2>nul

echo.
echo [SUCCESS] Agent Studio installation completed!
echo.

REM Ask if user wants to start the service
set /p START_NOW="Would you like to start the Agent Studio backend now? (y/N): "
if /i "%START_NOW%"=="y" (
    echo [INFO] Starting Agent Studio backend...
    start "" "%INSTALL_DIR%\start.bat"
    echo.
    echo [SUCCESS] Backend start script launched!
) else (
    echo.
    echo To start the backend later, run:
    echo   %INSTALL_DIR%\start.bat
)

echo.
echo 🎉 Installation Complete!
echo.
echo Agent Studio Backend is now installed in your user directory.
echo.
echo Useful commands:
echo   %INSTALL_DIR%\start.bat    # Start the backend
echo   %INSTALL_DIR%\stop.bat     # Stop the backend
echo.
echo Configuration file:
echo   %USERPROFILE%\.agent-studio-config\config.env
echo.
echo ✨ Access the application at:
echo    https://agentstudio-frontend.vercel.app/
echo.
echo 💡 After starting the backend, configure the backend URL in the web interface:
echo    Settings → API Configuration → http://localhost:4936
echo.
echo 📁 Slides directory: %SLIDES_DIR%
echo.
echo For more information, visit:
echo   https://github.com/git-men/agentstudio
echo.
pause
