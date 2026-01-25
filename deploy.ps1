# Script de deploy para Windows PowerShell
Write-Host "🚀 Actualizando repositorio para Railway deploy..." -ForegroundColor Green

# Agregar todos los cambios
git add .

# Hacer commit con mensaje descriptivo
git commit -m "Mejoras importantes: configuración robusta, manejo de errores y scripts de inicio mejorados

- ✅ Configuración separada en config.js
- ✅ Manejo robusto de errores con reconexión automática
- ✅ Control de rate limiting y redundancia
- ✅ Scripts de inicio mejorados
- ✅ Limpieza automática de estados
- ✅ Logging mejorado para debugging"

# Subir cambios al repositorio
git push origin master

Write-Host "✅ Repositorio actualizado exitosamente!" -ForegroundColor Green
Write-Host "🔄 Railway detectará los cambios y hará el deploy automáticamente" -ForegroundColor Yellow
