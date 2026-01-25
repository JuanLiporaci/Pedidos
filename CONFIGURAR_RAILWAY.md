# 🔧 Guía para Configurar Variables de Entorno en Railway

## Problema Actual

El bot está fallando porque falta la variable de entorno `TELEGRAM_BOT_TOKEN` en Railway.

## Solución: Configurar Variables de Entorno en Railway

### Paso 1: Acceder a Railway

1. Ve a [Railway Dashboard](https://railway.app)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto

### Paso 2: Configurar Variables de Entorno

1. En tu proyecto de Railway, haz clic en tu servicio (service)
2. Ve a la pestaña **"Variables"** o **"Environment Variables"**
3. Haz clic en **"New Variable"** o **"Add Variable"**

### Paso 3: Agregar las Variables Requeridas

Agrega las siguientes variables una por una:

#### 1. TELEGRAM_BOT_TOKEN (OBLIGATORIA)

- **Nombre de la variable**: `TELEGRAM_BOT_TOKEN`
- **Valor**: Tu token del bot de Telegram
  - Si no tienes el token, obtén uno de [@BotFather](https://t.me/BotFather) en Telegram
  - Envía `/newbot` y sigue las instrucciones
  - Copia el token que te proporcione BotFather

#### 2. SPREADSHEET_ID (OBLIGATORIA)

- **Nombre de la variable**: `SPREADSHEET_ID`
- **Valor**: El ID de tu Google Sheet
  - Ejemplo: `1CNyD_seHZZyB-2NPusYEpNGF8m5LzUz87RHIYitfnAU`
  - Se encuentra en la URL de tu Google Sheet: `https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit`

#### 3. GOOGLE_CREDENTIALS (OBLIGATORIA)

- **Nombre de la variable**: `GOOGLE_CREDENTIALS`
- **Valor**: El contenido de tu archivo `credentials.json` codificado en Base64
  - Si tienes el archivo `credentials.json` localmente, puedes codificarlo:
    - En Windows PowerShell:
      ```powershell
      $content = Get-Content -Path "credentials.json" -Raw
      [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
      ```
    - O simplemente pega el JSON completo (el código también acepta JSON directo)

### Paso 4: Verificar la Configuración

Después de agregar todas las variables:

1. Ve a la pestaña **"Deployments"** o **"Deploys"**
2. Haz clic en **"Redeploy"** o espera a que Railway detecte los cambios
3. Revisa los logs para verificar que el bot inicia correctamente

### Paso 5: Verificar que Funciona

1. En los logs de Railway, deberías ver:
   - `✅ Bot iniciado correctamente - Polling activo`
   - `Datos cargados exitosamente`
2. Prueba enviando un mensaje a tu bot en Telegram

## Solución Rápida

Si solo necesitas agregar `TELEGRAM_BOT_TOKEN` rápidamente:

1. Ve a Railway → Tu Proyecto → Variables
2. Agrega:
   - **Nombre**: `TELEGRAM_BOT_TOKEN`
   - **Valor**: `TU_TOKEN_AQUI`
3. Guarda y espera a que se redeplegue automáticamente

## Notas Importantes

- ⚠️ **Nunca compartas tus tokens públicamente**
- 🔒 Las variables de entorno en Railway son seguras y privadas
- 🔄 Después de agregar variables, Railway redeplegará automáticamente
- 📝 Puedes editar las variables en cualquier momento desde el dashboard

## Verificación de Variables Configuradas

Para verificar qué variables tienes configuradas, revisa los logs de Railway. El código muestra un mensaje de debug con las variables que encuentra (aunque no muestra los valores por seguridad).

Si ves este error:
```
Error: TELEGRAM_BOT_TOKEN no está configurado
```

Significa que la variable no está configurada o tiene un nombre incorrecto. Verifica:
- ✅ El nombre es exactamente `TELEGRAM_BOT_TOKEN` (sin espacios, mayúsculas correctas)
- ✅ El valor no está vacío
- ✅ Guardaste la variable correctamente

## Obtener Token de Telegram

Si necesitas crear un nuevo bot o obtener el token:

1. Abre Telegram y busca [@BotFather](https://t.me/BotFather)
2. Envía el comando `/newbot`
3. Sigue las instrucciones para crear tu bot
4. Cuando termines, BotFather te dará un token que se ve así: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
5. Copia ese token y úsalo como valor de `TELEGRAM_BOT_TOKEN` en Railway
