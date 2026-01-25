# 🔧 Solución: Variables de Entorno no Detectadas en Railway

## Problema

Las variables están configuradas en Railway pero el código no las detecta. Solo se ven variables `RAILWAY_*` pero no las personalizadas.

## Soluciones Comunes

### 1. Verificar Nivel de Configuración de Variables

En Railway, las variables pueden estar en dos niveles:

#### ✅ **Solución: Configurar en el Servicio (Service)**

1. Ve a tu proyecto en Railway
2. Haz clic en tu **servicio** (service), NO en el proyecto
3. Ve a la pestaña **"Variables"**
4. Asegúrate de que las variables estén aquí, no solo a nivel de proyecto

**Importante**: Las variables a nivel de proyecto pueden no heredarse correctamente. Configúralas directamente en el servicio.

### 2. Verificar el Entorno Correcto

1. En la pestaña de Variables, verifica que estés en el entorno correcto
2. Railway puede tener diferentes entornos (production, preview, etc.)
3. Asegúrate de configurar las variables en el entorno que estás usando

### 3. Verificar Nombre Exacto de la Variable

El nombre debe ser **exactamente** (sin espacios, mayúsculas/minúsculas correctas):
```
TELEGRAM_BOT_TOKEN
```

**NO**:
- `telegram_bot_token` (minúsculas)
- `TELEGRAM_BOT_TOKEN ` (con espacio al final)
- `TELEGRAM_BOT_TOKEN` (con caracteres invisibles)

### 4. Forzar Redespliegue

Después de agregar/modificar variables:

1. Ve a la pestaña **"Deployments"**
2. Haz clic en **"Redeploy"** o **"Deploy"**
3. Espera a que termine el despliegue
4. Revisa los logs nuevamente

### 5. Verificar que la Variable no Esté Vacía

1. En Railway, abre la variable `TELEGRAM_BOT_TOKEN`
2. Verifica que tenga un valor (no esté vacía)
3. El token debe verse así: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
4. No debe tener espacios al inicio o final

### 6. Usar Variables de Entorno en railway.json (Alternativa)

Si las variables no funcionan desde la UI, puedes intentar configurarlas en `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5,
    "envVars": {
      "TELEGRAM_BOT_TOKEN": "${{TELEGRAM_BOT_TOKEN}}"
    }
  }
}
```

**Nota**: Esto generalmente no es necesario, pero puede ayudar en algunos casos.

### 7. Verificar en el Dashboard de Railway

1. Ve a tu servicio en Railway
2. Abre **"Variables"**
3. Verifica que veas:
   - ✅ `TELEGRAM_BOT_TOKEN` (con valor)
   - ✅ `SPREADSHEET_ID` (si la usas)
   - ✅ `GOOGLE_CREDENTIALS` (si la usas)

### 8. Probar con un Script de Diagnóstico

He actualizado el código para mostrar más información de debug. Después del próximo deploy, los logs mostrarán:
- Si la variable existe pero está vacía
- Variables similares encontradas
- Total de variables de entorno

## Pasos Recomendados (En Orden)

1. ✅ **Verifica que estás en el servicio correcto** (no en el proyecto)
2. ✅ **Elimina y vuelve a crear la variable** `TELEGRAM_BOT_TOKEN`
3. ✅ **Copia el token directamente** desde BotFather (sin espacios)
4. ✅ **Guarda la variable**
5. ✅ **Haz un redeploy manual** desde la pestaña Deployments
6. ✅ **Revisa los nuevos logs** (ahora mostrarán más información de debug)

## Verificación Rápida

Para verificar rápidamente si Railway está pasando las variables:

1. Ve a los logs de Railway
2. Busca el mensaje `ENV_DEBUG_KEYS:`
3. Si ves `TELEGRAM_BOT_TOKEN` en esa lista, el problema es otro
4. Si NO lo ves, Railway no está pasando la variable

## Contacto con Railway

Si nada funciona, puede ser un problema de Railway. Considera:
- Verificar el estado de Railway: https://status.railway.app
- Contactar soporte de Railway
- Intentar crear un nuevo servicio y migrar las variables

## Nota sobre el Código Actualizado

He actualizado `index.js` para mostrar más información de debug:
- Verifica si la variable existe pero está vacía
- Muestra variables similares (por si hay un typo)
- Muestra el total de variables de entorno

Después del próximo deploy, los logs te darán más información sobre qué está pasando.
