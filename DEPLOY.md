# 🚀 Instrucciones de Deploy en Railway

## Configuración automática

Este proyecto está configurado para deploy automático en Railway. Cuando hagas push al repositorio, Railway detectará los cambios y hará el deploy automáticamente.

## Variables de entorno requeridas

Asegúrate de configurar estas variables en Railway:

### Variables obligatorias:
- `TELEGRAM_BOT_TOKEN`: Token de tu bot de Telegram
- `SPREADSHEET_ID`: ID de tu Google Sheet
- `GOOGLE_CREDENTIALS`: Credenciales de Google Cloud (JSON codificado en base64)

### Variables opcionales:
- `NODE_ENV`: `production` (por defecto)
- `PORT`: Puerto del servidor (Railway lo asigna automáticamente)

## Comandos de deploy

### Deploy automático (recomendado):
```bash
npm run deploy
```

### Deploy manual:
```bash
git add .
git commit -m "Tu mensaje de commit"
git push origin master
```

## Verificación del deploy

1. Ve a tu dashboard de Railway
2. Verifica que el deploy se completó exitosamente
3. Revisa los logs para asegurarte de que no hay errores
4. Prueba el bot enviando un mensaje

## Solución de problemas

### Si el deploy falla:
1. Verifica que todas las variables de entorno estén configuradas
2. Revisa los logs de Railway para identificar el error
3. Asegúrate de que el token del bot sea válido
4. Verifica que las credenciales de Google sean correctas

### Si el bot no responde:
1. Verifica que esté ejecutándose en Railway
2. Revisa los logs en tiempo real
3. Asegúrate de que el bot esté conectado a Telegram

## Monitoreo

- **Logs en tiempo real**: Disponibles en el dashboard de Railway
- **Estado del bot**: Se muestra en los logs cuando inicia
- **Reconexión automática**: El bot se reconecta automáticamente si hay errores
