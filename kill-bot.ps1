# Script para detectar y detener todas las instancias del bot
Write-Host "🔍 Buscando procesos del bot..." -ForegroundColor Yellow

# Buscar procesos de Node.js que ejecuten el bot
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*index.js*" -or $_.CommandLine -like "*start.js*"
}

if ($processes.Count -eq 0) {
    Write-Host "✅ No se encontraron procesos del bot ejecutándose" -ForegroundColor Green
} else {
    Write-Host "🛑 Encontrados $($processes.Count) procesos del bot:" -ForegroundColor Red
    
    foreach ($process in $processes) {
        Write-Host "  - PID: $($process.Id), Memoria: $([math]::Round($process.WorkingSet64/1MB, 2)) MB" -ForegroundColor Yellow
    }
    
    $confirm = Read-Host "¿Deseas detener todos estos procesos? (s/n)"
    
    if ($confirm -eq "s" -or $confirm -eq "S") {
        foreach ($process in $processes) {
            try {
                Stop-Process -Id $process.Id -Force
                Write-Host "✅ Proceso $($process.Id) detenido" -ForegroundColor Green
            } catch {
                Write-Host "❌ Error al detener proceso $($process.Id): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        Write-Host "✅ Todos los procesos del bot han sido detenidos" -ForegroundColor Green
    } else {
        Write-Host "❌ Operación cancelada" -ForegroundColor Yellow
    }
}

Write-Host "`n💡 Para iniciar el bot nuevamente, usa: npm run start:robust" -ForegroundColor Cyan
