# Script para convertir credenciales JSON a Base64
Write-Host "🔧 Convertidor de credenciales JSON a Base64" -ForegroundColor Cyan

# Solicitar ruta del archivo JSON
$jsonPath = Read-Host "Ingresa la ruta completa del archivo JSON descargado (ej: C:\Users\juan\Downloads\telegram-bot-sheets-123456.json)"

# Verificar que el archivo existe
if (-not (Test-Path $jsonPath)) {
    Write-Host "❌ Error: El archivo no existe en la ruta especificada" -ForegroundColor Red
    Write-Host "💡 Asegúrate de que la ruta sea correcta y el archivo exista" -ForegroundColor Yellow
    exit 1
}

try {
    # Leer el contenido del archivo JSON
    Write-Host "📖 Leyendo archivo JSON..." -ForegroundColor Yellow
    $content = Get-Content $jsonPath -Raw -Encoding UTF8
    
    # Verificar que es un JSON válido
    $jsonObject = $content | ConvertFrom-Json
    Write-Host "✅ Archivo JSON válido detectado" -ForegroundColor Green
    
    # Convertir a Base64
    Write-Host "🔄 Convirtiendo a Base64..." -ForegroundColor Yellow
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    $base64 = [System.Convert]::ToBase64String($bytes)
    
    # Copiar al portapapeles
    $base64 | Set-Clipboard
    
    Write-Host "✅ Conversión completada exitosamente!" -ForegroundColor Green
    Write-Host "📋 El valor Base64 ha sido copiado al portapapeles" -ForegroundColor Green
    Write-Host "📏 Longitud del valor Base64: $($base64.Length) caracteres" -ForegroundColor Cyan
    
    Write-Host "`n📝 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Ve a tu proyecto en Railway" -ForegroundColor Yellow
    Write-Host "2. Ve a la sección 'Variables'" -ForegroundColor Yellow
    Write-Host "3. Actualiza la variable 'GOOGLE_CREDENTIALS'" -ForegroundColor Yellow
    Write-Host "4. Pega el valor Base64 (ya está en tu portapapeles)" -ForegroundColor Yellow
    Write-Host "5. Guarda los cambios" -ForegroundColor Yellow
    
    # Mostrar preview del valor
    $preview = if ($base64.Length -gt 50) { $base64.Substring(0, 50) + "..." } else { $base64 }
    Write-Host "`n👀 Preview del valor Base64: $preview" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error durante la conversión: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Verifica que el archivo sea un JSON válido" -ForegroundColor Yellow
}
