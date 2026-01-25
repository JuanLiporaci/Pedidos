# Script para verificar el estado del bot y credenciales
Write-Host "🔍 Verificando estado del bot..." -ForegroundColor Yellow

# Verificar procesos del bot
$botProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*index.js*" -or $_.CommandLine -like "*start.js*"
}

Write-Host "`n📊 Procesos del bot encontrados: $($botProcesses.Count)" -ForegroundColor Cyan

if ($botProcesses.Count -gt 0) {
    foreach ($process in $botProcesses) {
        Write-Host "  - PID: $($process.Id), Memoria: $([math]::Round($process.WorkingSet64/1MB, 2)) MB" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✅ No hay procesos del bot ejecutándose" -ForegroundColor Green
}

# Verificar variables de entorno
Write-Host "`n🔑 Verificando variables de entorno..." -ForegroundColor Cyan

$envVars = @("TELEGRAM_BOT_TOKEN", "SPREADSHEET_ID", "GOOGLE_CREDENTIALS")

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        $length = $value.Length
        $preview = if ($length -gt 20) { $value.Substring(0, 20) + "..." } else { $value }
        Write-Host "  ✅ $var: $preview (longitud: $length)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $var: NO CONFIGURADA" -ForegroundColor Red
    }
}

# Verificar conexión a Google Sheets
Write-Host "`n🌐 Verificando conexión a Google Sheets..." -ForegroundColor Cyan

try {
    $testUrl = "https://sheets.googleapis.com/v4/spreadsheets"
    $response = Invoke-WebRequest -Uri $testUrl -Method GET -TimeoutSec 10
    Write-Host "  ✅ Conexión a Google Sheets: OK" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Conexión a Google Sheets: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Verificar conexión a Telegram
Write-Host "`n📱 Verificando conexión a Telegram..." -ForegroundColor Cyan

try {
    $token = [Environment]::GetEnvironmentVariable("TELEGRAM_BOT_TOKEN")
    if ($token) {
        $telegramUrl = "https://api.telegram.org/bot$token/getMe"
        $response = Invoke-WebRequest -Uri $telegramUrl -Method GET -TimeoutSec 10
        $botInfo = $response.Content | ConvertFrom-Json
        if ($botInfo.ok) {
            Write-Host "  ✅ Bot de Telegram: $($botInfo.result.first_name) (@$($botInfo.result.username))" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Bot de Telegram: ERROR - $($botInfo.description)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ Token de Telegram no configurado" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Conexión a Telegram: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n💡 Comandos útiles:" -ForegroundColor Cyan
Write-Host "  - Detener bot: npm run kill-bot" -ForegroundColor Yellow
Write-Host "  - Iniciar bot: npm run start:robust" -ForegroundColor Yellow
Write-Host "  - Ver logs: npm run dev" -ForegroundColor Yellow
