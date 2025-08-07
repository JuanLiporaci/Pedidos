# 🔧 Guía para solucionar credenciales de Google

## Problema: Invalid JWT Signature

### Solución 1: Regenerar credenciales de Google Cloud

1. **Ve a Google Cloud Console:**
   - https://console.cloud.google.com/
   - Selecciona tu proyecto

2. **Ve a APIs y servicios > Credenciales:**
   - Busca tu Service Account
   - Haz clic en "Crear credenciales" > "Cuenta de servicio"

3. **Configura la cuenta de servicio:**
   - Nombre: `telegram-bot`
   - Descripción: `Bot de Telegram para Google Sheets`

4. **Asigna roles:**
   - Editor de Google Sheets
   - Usuario de Google Drive

5. **Crea y descarga la clave:**
   - Haz clic en la cuenta de servicio creada
   - Ve a "Claves" > "Agregar clave" > "Crear nueva clave"
   - Selecciona "JSON"
   - Descarga el archivo

### Solución 2: Convertir a Base64 para Railway

```bash
# En PowerShell:
$content = Get-Content "ruta/al/archivo.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [System.Convert]::ToBase64String($bytes)
$base64 | Set-Clipboard
```

### Solución 3: Actualizar variable en Railway

1. Ve a tu proyecto en Railway
2. Ve a "Variables"
3. Actualiza `GOOGLE_CREDENTIALS` con el nuevo valor base64

### Solución 4: Verificar permisos del Google Sheet

1. Abre tu Google Sheet
2. Haz clic en "Compartir"
3. Agrega el email de la cuenta de servicio con permisos de "Editor"

## Verificación

Después de actualizar las credenciales, el bot debería mostrar:
```
Usando credenciales desde variable de entorno
Datos cargados exitosamente
```
