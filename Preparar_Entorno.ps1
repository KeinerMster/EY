param(
    [switch]$SkipFirewall
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $Root 'runtime\node'
$LocalNode = Join-Path $RuntimeDir 'node.exe'
$LocalNpm = Join-Path $RuntimeDir 'npm.cmd'
$NodePathFile = Join-Path $Root 'node-path.txt'
$FirewallScript = Join-Path $Root 'Configurar_Firewall.ps1'

function Test-UsableNode([string]$NodeExe) {
    if ([string]::IsNullOrWhiteSpace($NodeExe) -or !(Test-Path -LiteralPath $NodeExe)) { return $false }
    $dir = Split-Path -Parent $NodeExe
    $npm = Join-Path $dir 'npm.cmd'
    if (!(Test-Path -LiteralPath $npm)) { return $false }
    try {
        $v = (& $NodeExe --version 2>$null | Out-String).Trim()
        $versionMatch = [regex]::Match($v, '^v?(\d+)\.')
        if ($LASTEXITCODE -ne 0 -or !$versionMatch.Success) { return $false }
        if ([int]$versionMatch.Groups[1].Value -lt 20) { return $false }
        $npmVersion = (& $npm --version 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($npmVersion)) { return $false }
        return $true
    } catch { return $false }
}

function Install-PortableNode {
    $machineArch = $env:PROCESSOR_ARCHITECTURE
    if (![string]::IsNullOrWhiteSpace($env:PROCESSOR_ARCHITEW6432)) { $machineArch = $env:PROCESSOR_ARCHITEW6432 }
    switch -Regex ($machineArch) {
        '^ARM64$' { $arch = 'arm64'; break }
        '^(AMD64|x64)$' { $arch = 'x64'; break }
        '^(x86|i386|i686)$' { $arch = 'x86'; break }
        default { throw "Arquitectura de Windows no compatible automáticamente: $machineArch. Se requiere Windows x64 o ARM64." }
    }

    Write-Host ''
    Write-Host 'No se encontró una instalación compatible de Node.js.' -ForegroundColor Yellow
    Write-Host 'Descargando Node.js LTS oficial. Esto solo se hace la primera vez y no modifica el PATH de Windows.' -ForegroundColor Cyan

    $tempRoot = Join-Path $env:TEMP ('Cosmodromo_Node_' + [Guid]::NewGuid().ToString('N'))
    $expandDir = Join-Path $tempRoot 'extraido'
    New-Item -ItemType Directory -Path $expandDir -Force | Out-Null
    try {
        # The official Node.js dist index lists downloadable archives as "win-x64-zip"
        # and "win-arm64-zip" (not just "win-x64" / "win-arm64"). Match the exact
        # archive identifier here; otherwise a supported 64-bit PC is incorrectly rejected.
        $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -Method Get -TimeoutSec 45
        $platformArchive = "win-$arch-zip"
        $release = $index | Where-Object {
            $_.lts -and $_.version -and ($null -ne $_.files) -and ($_.files -contains $platformArchive)
        } | Select-Object -First 1
        if ($null -eq $release) {
            if ($arch -eq 'x86') {
                throw 'Windows detectado como 32 bits (x86). Las versiones LTS actuales de Node.js ya no ofrecen el ZIP x86 necesario. Usa Windows x64 o ARM64 para la instalación automática.'
            }
            throw "El catálogo oficial de Node.js no devolvió un paquete LTS '$platformArchive'. Arquitectura detectada: $arch. Comprueba que https://nodejs.org/dist/index.json se pueda abrir desde este PC y vuelve a intentarlo."
        }

        $version = [string]$release.version
        $archive = "node-$version-win-$arch.zip"
        $baseUrl = "https://nodejs.org/dist/$version/"
        $zipPath = Join-Path $tempRoot $archive
        $checksumsPath = Join-Path $tempRoot 'SHASUMS256.txt'

        Write-Host "Versión seleccionada: Node.js $version (Windows $arch, paquete $platformArchive)" -ForegroundColor Green
        Write-Host 'Descargando paquete oficial…'
        Invoke-WebRequest -Uri ($baseUrl + $archive) -OutFile $zipPath -UseBasicParsing -TimeoutSec 180
        Invoke-WebRequest -Uri ($baseUrl + 'SHASUMS256.txt') -OutFile $checksumsPath -UseBasicParsing -TimeoutSec 45

        $checksumText = Get-Content -LiteralPath $checksumsPath -Raw
        $pattern = '^\s*([a-fA-F0-9]{64})\s+' + [regex]::Escape($archive) + '\s*$'
        $checksumLine = $checksumText -split "`n" | Where-Object { $_ -match $pattern } | Select-Object -First 1
        $checksumMatch = [regex]::Match([string]$checksumLine, $pattern)
        if ([string]::IsNullOrWhiteSpace($checksumLine) -or !$checksumMatch.Success) {
            throw 'No se encontró la suma SHA-256 oficial del paquete descargado.'
        }
        $expectedHash = $checksumMatch.Groups[1].Value.ToLowerInvariant()
        $actualHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -ne $expectedHash) {
            throw 'La verificación SHA-256 falló. El archivo descargado no se instalará.'
        }
        Write-Host 'Verificación SHA-256 correcta.' -ForegroundColor Green

        Expand-Archive -LiteralPath $zipPath -DestinationPath $expandDir -Force
        $unpacked = Join-Path $expandDir ("node-$version-win-$arch")
        if (!(Test-Path -LiteralPath (Join-Path $unpacked 'node.exe')) -or !(Test-Path -LiteralPath (Join-Path $unpacked 'npm.cmd'))) {
            throw 'El paquete de Node.js no contiene node.exe y npm.cmd donde se esperaba.'
        }

        New-Item -ItemType Directory -Path (Split-Path -Parent $RuntimeDir) -Force | Out-Null
        if (Test-Path -LiteralPath $RuntimeDir) { Remove-Item -LiteralPath $RuntimeDir -Recurse -Force }
        Move-Item -LiteralPath $unpacked -Destination $RuntimeDir | Out-Null
        if (!(Test-UsableNode $LocalNode)) { throw 'Node.js se descargó, pero la comprobación de ejecución no pasó.' }
        return $LocalNode
    } finally {
        if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

function Test-FirewallRule([string]$NodeExe) {
    try {
        $rule = Get-NetFirewallRule -Name 'Cosmodromo-Servidor-Red-Privada' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -eq $rule -or $rule.Enabled.ToString() -ne 'True' -or $rule.Profile.ToString() -notmatch 'Private') { return $false }
        $app = Get-NetFirewallApplicationFilter -AssociatedNetFirewallRule $rule -ErrorAction SilentlyContinue
        if ($null -eq $app -or $app.Program -ine $NodeExe) { return $false }
        return $true
    } catch { return $false }
}

function Configure-PrivateFirewall([string]$NodeExe) {
    if (Test-FirewallRule $NodeExe) {
        Write-Host 'Firewall: regla de red privada ya configurada.' -ForegroundColor Green
        return
    }
    Write-Host ''
    Write-Host 'Para abrir el juego desde el móvil, Windows solicitará permiso una sola vez para autorizar este servidor SOLO en redes privadas y dispositivos de la red local.' -ForegroundColor Cyan
    try {
        $argumentLine = '-NoProfile -ExecutionPolicy Bypass -File "' + $FirewallScript + '" -NodePath "' + $NodeExe + '"'
        $powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $proc = Start-Process -FilePath $powershellExe -ArgumentList $argumentLine -Verb RunAs -Wait -PassThru
        if ($proc.ExitCode -eq 0 -and (Test-FirewallRule $NodeExe)) {
            Write-Host 'Firewall configurado para la red privada.' -ForegroundColor Green
        } else {
            Write-Warning 'No se pudo confirmar la regla del Firewall. El juego de PC seguirá funcionando; para el móvil quizá debas permitir node.exe manualmente en redes privadas.'
        }
    } catch {
        Write-Warning 'No se obtuvo permiso para configurar el Firewall. El juego local seguirá funcionando; la conexión móvil puede requerir una regla manual para redes privadas.'
    }
}

try {
    Write-Host 'COSMODROMO — Preparación automática' -ForegroundColor Cyan
    Write-Host '1/3 · Comprobando Node.js y npm…'

    $selectedNode = $null
    if (Test-UsableNode $LocalNode) {
        $selectedNode = $LocalNode
        Write-Host 'Node.js portátil de Cosmódromo ya está instalado.' -ForegroundColor Green
    } else {
        # Reuse a compatible Node installation already present on the PC before downloading another copy.
        $systemNode = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $systemNode -and (Test-UsableNode $systemNode.Source)) {
            $selectedNode = $systemNode.Source
            Write-Host "Se reutilizará Node.js ya instalado: $selectedNode" -ForegroundColor Green
        } else {
            $selectedNode = Install-PortableNode
        }
    }

    [System.IO.File]::WriteAllText($NodePathFile, $selectedNode, [System.Text.UTF8Encoding]::new($false))
    $selectedDir = Split-Path -Parent $selectedNode
    $npmPath = Join-Path $selectedDir 'npm.cmd'
    Write-Host "Node.js: $((& $selectedNode --version | Out-String).Trim())" -ForegroundColor Green
    Write-Host "npm: $((& $npmPath --version | Out-String).Trim())" -ForegroundColor Green

    if (!$SkipFirewall) {
        Write-Host '2/3 · Comprobando acceso desde la red local…'
        Configure-PrivateFirewall $selectedNode
    } else {
        Write-Host '2/3 · Configuración de Firewall omitida para la construcción del ejecutable.'
    }

    Write-Host '3/3 · Entorno listo.' -ForegroundColor Green
    exit 0
} catch {
    Write-Host ''
    Write-Host ('ERROR AL PREPARAR COSMODROMO: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'Comprueba tu conexión a Internet y vuelve a ejecutar INICIAR_COSMODROMO.bat.' -ForegroundColor Yellow
    exit 1
}
