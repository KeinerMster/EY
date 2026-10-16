param(
    [Parameter(Mandatory = $true)]
    [string]$NodePath
)

$ErrorActionPreference = 'Stop'
$RuleName = 'Cosmodromo-Servidor-Red-Privada'
$DisplayName = 'Cosmodromo — servidor en red privada'

try {
    Import-Module NetSecurity -ErrorAction Stop
    $NodePath = [System.IO.Path]::GetFullPath($NodePath)
    if (!(Test-Path -LiteralPath $NodePath)) { throw 'No se encontró node.exe en la ruta indicada.' }

    # Recreate only our own named rule. It is restricted to Private profiles, the local subnet,
    # TCP ports 3000-3099 and this specific node.exe path. Public networks remain blocked.
    $oldRule = Get-NetFirewallRule -Name $RuleName -ErrorAction SilentlyContinue
    if ($oldRule) { Remove-NetFirewallRule -Name $RuleName -ErrorAction SilentlyContinue }

    New-NetFirewallRule `
        -Name $RuleName `
        -DisplayName $DisplayName `
        -Direction Inbound `
        -Action Allow `
        -Enabled True `
        -Profile Private `
        -Program $NodePath `
        -Protocol TCP `
        -LocalPort '3000-3099' `
        -RemoteAddress LocalSubnet | Out-Null

    Write-Host 'Regla añadida: solo redes privadas y dispositivos de la subred local.' -ForegroundColor Green
    exit 0
} catch {
    Write-Host ('No se pudo configurar el Firewall: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
