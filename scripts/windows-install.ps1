# Agent Studio Windows Installation Script
# This script downloads and installs Agent Studio backend with all dependencies on Windows
# Usage: 
#   PowerShell -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/windows-install.ps1'))"

param(
    [string]$InstallDir = "$env:USERPROFILE\.agent-studio",
    [string]$SlidesDir = "$env:USERPROFILE\slides",
    [string]$GitHubRepo = "git-men/agentstudio",
    [string]$GitHubBranch = "main"
)

# Configuration
$ServicePort = "4936"
$TempDir = "$env:TEMP\agent-studio-install-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Logging functions
function Write-Log {
    param([string]$Message, [string]$Color = "Blue")
    Write-Host "[INFO] $Message" -ForegroundColor $Color
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

# Check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check PowerShell version
function Test-PowerShellVersion {
    Write-Log "Checking PowerShell version..."
    $version = $PSVersionTable.PSVersion.Major
    if ($version -lt 5) {
        Write-Error "PowerShell 5.0 or later is required. Current version: $($PSVersionTable.PSVersion)"
        return $false
    }
    Write-Success "PowerShell $($PSVersionTable.PSVersion) is available"
    return $true
}

# Check and install Chocolatey
function Install-Chocolatey {
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Success "Chocolatey is already installed"
        return $true
    }
    
    Write-Log "Installing Chocolatey package manager..."
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            Write-Success "Chocolatey installed successfully"
            return $true
        } else {
            Write-Error "Chocolatey installation failed"
            return $false
        }
    } catch {
        Write-Error "Failed to install Chocolatey: $($_.Exception.Message)"
        return $false
    }
}

# Check and install Node.js
function Install-NodeJS {
    Write-Log "Checking Node.js installation..."
    
    # Check if Node.js is already installed and version is sufficient
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
            if ($versionNumber -ge 18) {
                Write-Success "Node.js $nodeVersion is available"
                return $true
            } else {
                Write-Warning "Node.js version is too old: $nodeVersion. Need version 18 or later."
            }
        }
    } catch {
        Write-Log "Node.js is not installed."
    }
    
    # Ask user if they want to install Node.js
    $response = Read-Host "Would you like to install Node.js automatically? (Y/n)"
    if ($response -match '^[Nn]$') {
        Write-Error "Node.js is required to continue. Please install Node.js 18 or later first."
        Write-Error "Visit: https://nodejs.org/"
        return $false
    }
    
    Write-Log "Installing Node.js..."
    
    # Try different installation methods
    $installed = $false
    
    # Method 1: Try Chocolatey if available
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        try {
            Write-Log "Installing Node.js via Chocolatey..."
            choco install nodejs -y
            $installed = $true
        } catch {
            Write-Warning "Chocolatey installation failed, trying alternative method..."
        }
    }
    
    # Method 2: Try winget (Windows Package Manager)
    if (-not $installed -and (Get-Command winget -ErrorAction SilentlyContinue)) {
        try {
            Write-Log "Installing Node.js via winget..."
            winget install OpenJS.NodeJS -e --silent
            $installed = $true
        } catch {
            Write-Warning "winget installation failed, trying alternative method..."
        }
    }
    
    # Method 3: Download and install manually
    if (-not $installed) {
        try {
            Write-Log "Downloading Node.js installer..."
            $nodeUrl = "https://nodejs.org/dist/latest-v20.x/node-v20.20.0-x64.msi"
            $installerPath = "$env:TEMP\nodejs-installer.msi"
            
            Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath
            
            Write-Log "Installing Node.js..."
            Start-Process msiexec.exe -ArgumentList "/i", $installerPath, "/quiet", "/norestart" -Wait
            
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
            $installed = $true
        } catch {
            Write-Error "Manual installation failed: $($_.Exception.Message)"
        }
    }
    
    if ($installed) {
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Verify installation
        try {
            $nodeVersion = node --version 2>$null
            if ($nodeVersion) {
                Write-Success "Node.js $nodeVersion installed successfully"
                return $true
            }
        } catch {
            Write-Error "Node.js installation verification failed"
        }
    }
    
    Write-Error "Node.js installation failed. Please install manually."
    Write-Error "Visit: https://nodejs.org/"
    return $false
}

# Check and install pnpm
function Install-Pnpm {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        Write-Success "pnpm is available"
        return $true
    }
    
    $response = Read-Host "pnpm not found. Would you like to install it for faster package management? (Y/n)"
    if ($response -match '^[Nn]$') {
        Write-Log "Will use npm instead of pnpm"
        return $false
    }
    
    Write-Log "Installing pnpm..."
    try {
        npm install -g pnpm
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            Write-Success "pnpm installed successfully"
            return $true
        } else {
            Write-Warning "pnpm installation failed, will use npm instead"
            return $false
        }
    } catch {
        Write-Warning "pnpm installation failed, will use npm instead"
        return $false
    }
}

# Check and install Git
function Install-Git {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Success "Git is available"
        return $true
    }
    
    Write-Log "Git is not installed."
    $response = Read-Host "Would you like to install Git automatically? (Y/n)"
    if ($response -match '^[Nn]$') {
        Write-Error "Git is required to continue. Please install Git first."
        Write-Error "Visit: https://git-scm.com/"
        return $false
    }
    
    Write-Log "Installing Git..."
    
    # Try different installation methods
    $installed = $false
    
    # Method 1: Try Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        try {
            choco install git -y
            $installed = $true
        } catch {
            Write-Warning "Chocolatey installation failed, trying alternative method..."
        }
    }
    
    # Method 2: Try winget
    if (-not $installed -and (Get-Command winget -ErrorAction SilentlyContinue)) {
        try {
            winget install Git.Git -e --silent
            $installed = $true
        } catch {
            Write-Warning "winget installation failed"
        }
    }
    
    if ($installed) {
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (Get-Command git -ErrorAction SilentlyContinue) {
            Write-Success "Git installed successfully"
            return $true
        }
    }
    
    Write-Error "Git installation failed. Please install manually."
    Write-Error "Visit: https://git-scm.com/"
    return $false
}

# Download Agent Studio
function Get-AgentStudio {
    Write-Log "Downloading Agent Studio..."
    
    # Clean up any existing temp directory
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    
    Set-Location $TempDir
    
    try {
        if (Get-Command git -ErrorAction SilentlyContinue) {
            git clone "https://github.com/$GitHubRepo.git" .
            git checkout $GitHubBranch
        } else {
            # Fallback to downloading zip
            $zipUrl = "https://github.com/$GitHubRepo/archive/$GitHubBranch.zip"
            $zipPath = "$TempDir\agent-studio.zip"
            
            Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
            Expand-Archive -Path $zipPath -DestinationPath $TempDir -Force
            
            # Move contents from extracted folder to temp dir
            $extractedFolder = Get-ChildItem $TempDir -Directory | Where-Object { $_.Name -like "*agent*" } | Select-Object -First 1
            if ($extractedFolder) {
                Get-ChildItem $extractedFolder.FullName | Move-Item -Destination $TempDir
                Remove-Item $extractedFolder.FullName -Recurse -Force
            }
            
            Remove-Item $zipPath -Force
        }
        
        Write-Success "Agent Studio downloaded successfully"
        return $true
    } catch {
        Write-Error "Failed to download Agent Studio: $($_.Exception.Message)"
        return $false
    }
}

# Install Agent Studio
function Install-AgentStudio {
    Write-Log "Installing Agent Studio..."
    
    # Create directories
    Write-Log "Creating directories..."
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    New-Item -ItemType Directory -Path "$env:USERPROFILE\.agent-studio-logs" -Force | Out-Null
    New-Item -ItemType Directory -Path "$env:USERPROFILE\.agent-studio-config" -Force | Out-Null
    New-Item -ItemType Directory -Path $SlidesDir -Force | Out-Null
    
    # Copy files
    Write-Log "Copying application files..."
    Copy-Item "$TempDir\*" -Destination $InstallDir -Recurse -Force
    
    Set-Location $InstallDir
    
    # Set CI environment variable to handle TTY issues
    $env:CI = "true"
    
    # Install dependencies and try to build
    Write-Log "Installing dependencies..."
    $BuildSuccess = $false
    
    $UsePnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    
    try {
        if ($UsePnpm) {
            Write-Log "Using pnpm for installation..."
            pnpm install --prod
            
            # Try to build
            Write-Log "Attempting to build backend..."
            try {
                pnpm run build:backend
                $BuildSuccess = $true
                Write-Success "Build successful"
            } catch {
                Write-Warning "Build failed, installing dev dependencies..."
                pnpm install
                
                # Try building again
                Write-Log "Retrying build with dev dependencies..."
                try {
                    pnpm run build:backend
                    $BuildSuccess = $true
                    Write-Success "Build successful after installing dev dependencies"
                } catch {
                    Write-Warning "Build still failed, will run in development mode"
                }
            }
        } else {
            Write-Log "Using npm for installation..."
            npm install --production
            
            # Try to build
            Write-Log "Attempting to build backend..."
            try {
                npm run build:backend
                $BuildSuccess = $true
                Write-Success "Build successful"
            } catch {
                Write-Warning "Build failed, installing dev dependencies..."
                npm install
                
                # Try building again
                Write-Log "Retrying build with dev dependencies..."
                try {
                    npm run build:backend
                    $BuildSuccess = $true
                    Write-Success "Build successful after installing dev dependencies"
                } catch {
                    Write-Warning "Build still failed, will run in development mode"
                }
            }
        }
    } catch {
        Write-Error "Installation failed: $($_.Exception.Message)"
        return $false
    }
    
    # Create start script
    Write-Log "Creating start script..."
    $startScriptContent = if ($BuildSuccess) {
        @"
@echo off
echo 🚀 Starting Agent Studio Backend (Production Mode)...
cd /d "$InstallDir"
set NODE_ENV=production
set PORT=$ServicePort
set SLIDES_DIR=$SlidesDir
echo 📂 Working directory: %CD%
echo 🌐 Backend port: $ServicePort
echo 📑 Slides directory: $SlidesDir
echo.
echo ✨ Access the application at:
echo    https://agentstudio-frontend.vercel.app/
echo.
echo 💡 Configure the backend URL in the web interface:
echo    Settings → API Configuration → http://localhost:$ServicePort
echo.
node backend\dist\index.js
pause
"@
    } else {
        if ($UsePnpm) {
            @"
@echo off
echo 🚀 Starting Agent Studio Backend (Development Mode)...
cd /d "$InstallDir"
set NODE_ENV=development
set PORT=$ServicePort
set SLIDES_DIR=$SlidesDir
echo 📂 Working directory: %CD%
echo 🌐 Backend port: $ServicePort
echo 📑 Slides directory: $SlidesDir
echo.
echo ✨ Access the application at:
echo    https://agentstudio-frontend.vercel.app/
echo.
echo 💡 Configure the backend URL in the web interface:
echo    Settings → API Configuration → http://localhost:$ServicePort
echo.
pnpm run dev:backend
pause
"@
        } else {
            @"
@echo off
echo 🚀 Starting Agent Studio Backend (Development Mode)...
cd /d "$InstallDir"
set NODE_ENV=development
set PORT=$ServicePort
set SLIDES_DIR=$SlidesDir
echo 📂 Working directory: %CD%
echo 🌐 Backend port: $ServicePort
echo 📑 Slides directory: $SlidesDir
echo.
echo ✨ Access the application at:
echo    https://agentstudio-frontend.vercel.app/
echo.
echo 💡 Configure the backend URL in the web interface:
echo    Settings → API Configuration → http://localhost:$ServicePort
echo.
npm run dev:backend
pause
"@
        }
    }
    
    $startScriptContent | Out-File -FilePath "$InstallDir\start.bat" -Encoding ASCII
    
    # Create stop script
    $stopScriptContent = @"
@echo off
echo 🛑 Stopping Agent Studio Backend...
taskkill /f /im node.exe 2>nul || echo No Node.js process running
echo Backend stopped.
pause
"@
    
    $stopScriptContent | Out-File -FilePath "$InstallDir\stop.bat" -Encoding ASCII
    
    # Create config file
    Write-Log "Creating configuration file..."
    $configContent = @"
# Agent Studio 配置
NODE_ENV=production
PORT=$ServicePort
SLIDES_DIR=$SlidesDir

# 可选: AI 提供商
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
"@
    
    $configContent | Out-File -FilePath "$env:USERPROFILE\.agent-studio-config\config.env" -Encoding UTF8
    
    Write-Success "Agent Studio installation completed"
    
    if ($BuildSuccess) {
        Write-Success "Build successful - will run in production mode"
    } else {
        Write-Warning "Build failed - will run in development mode (slower startup)"
    }
    
    return $true
}

# Cleanup temp files
function Remove-TempFiles {
    Write-Log "Cleaning up temporary files..."
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Success "Cleanup completed"
}

# Start the service
function Start-Service {
    Write-Host ""
    $response = Read-Host "Would you like to start the Agent Studio backend now? (y/N)"
    
    if ($response -match '^[Yy]$') {
        Write-Log "Starting Agent Studio backend..."
        
        if (Test-Path "$InstallDir\start.bat") {
            Write-Log "Running start script..."
            Start-Process -FilePath "$InstallDir\start.bat" -WorkingDirectory $InstallDir
            
            Write-Success "Backend start script launched!"
            Write-Host ""
            Write-Host "✨ Access the application at:"
            Write-Host "   https://agentstudio-frontend.vercel.app/"
            Write-Host ""
            Write-Host "💡 Configure the backend URL in the web interface:"
            Write-Host "   Settings → API Configuration → http://localhost:$ServicePort"
        } else {
            Write-Error "Start script not found. Please check the installation."
        }
    } else {
        Write-Host ""
        Write-Host "To start the backend later, run:"
        Write-Host "  $InstallDir\start.bat"
    }
}

# Main installation function
function Main {
    Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║       Agent Studio Windows Installer     ║" -ForegroundColor Cyan
    Write-Host "║                                          ║" -ForegroundColor Cyan
    Write-Host "║  This will install:                      ║" -ForegroundColor Cyan
    Write-Host "║  • Agent Studio Backend (user-local)    ║" -ForegroundColor Cyan
    Write-Host "║  • Node.js (if not available)           ║" -ForegroundColor Cyan
    Write-Host "║  • Dependencies (npm/pnpm)              ║" -ForegroundColor Cyan
    Write-Host "║  • Start/Stop scripts                   ║" -ForegroundColor Cyan
    Write-Host "║  • Configuration files                  ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # Check prerequisites
    if (-not (Test-PowerShellVersion)) { return }
    
    # Install Chocolatey (optional, for easier package management)
    if (-not (Test-Administrator)) {
        Write-Warning "Not running as Administrator. Some installation methods may not be available."
        Write-Log "You can still install using user-level methods."
    } else {
        Install-Chocolatey | Out-Null
    }
    
    # Check and install required tools
    if (-not (Install-Git)) { return }
    if (-not (Install-NodeJS)) { return }
    Install-Pnpm | Out-Null
    
    # Download and install Agent Studio
    if (-not (Get-AgentStudio)) { return }
    if (-not (Install-AgentStudio)) { return }
    
    # Start the service
    Start-Service
    
    Write-Host ""
    Write-Host "🎉 Installation Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agent Studio Backend is now installed in your user directory."
    Write-Host ""
    Write-Host "Useful commands:"
    Write-Host "  $InstallDir\start.bat    # Start the backend"
    Write-Host "  $InstallDir\stop.bat     # Stop the backend"
    Write-Host ""
    Write-Host "Configuration file:"
    Write-Host "  $env:USERPROFILE\.agent-studio-config\config.env"
    Write-Host ""
    Write-Host "✨ Access the application at:"
    Write-Host "   https://agentstudio-frontend.vercel.app/"
    Write-Host ""
    Write-Host "💡 After starting the backend, configure the backend URL in the web interface:"
    Write-Host "   Settings → API Configuration → http://localhost:$ServicePort"
    Write-Host ""
    Write-Host "📁 Slides directory: $SlidesDir"
    Write-Host ""
    Write-Host "For more information, visit:"
    Write-Host "  https://github.com/$GitHubRepo"
    Write-Host ""
    
    # Clean up temp files at the end
    Remove-TempFiles
}

# Handle script interruption
trap {
    Write-Error "Installation interrupted: $($_.Exception.Message)"
    Remove-TempFiles
    exit 1
}

# Run main function
Main
