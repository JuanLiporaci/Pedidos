# 🔧 Solución: Variable Configurada pero No Detectada en Railway

## El Problema

La variable `TELEGRAM_BOT_TOKEN` **está configurada en Railway** (lo puedes ver en el dashboard), pero el código dice que **no está configurada**. Esto significa que Railway no está pasando la variable al contenedor.

## Causas Comunes

### 1. ⚠️ Variable en Nivel Incorrecto (MÁS COMÚN)

Railway tiene dos niveles de variables:
- **Project Variables** (Variables de Proyecto)
- **Service Variables** (Variables de Servicio) ← **DEBE ESTAR AQUÍ**

**Solución:**
1. Ve a tu **SERVICIO** (no al proyecto)
2. Pestaña **"Variables"**
3. Verifica que `TELEGRAM_BOT_TOKEN` esté en **"Service Variables"**
4. Si está en "Shared Variables" o "Project Variables", muévela a "Service Variables"

### 2. ⚠️ Variable en Entorno Incorrecto

Railway puede tener diferentes entornos (production, preview, etc.)

**Solución:**
1. En la pestaña Variables, verifica el selector de entorno
2. Asegúrate de estar en el entorno correcto (generalmente "production")
3. Verifica que la variable esté en ese entorno específico

### 3. ⚠️ Necesita Redeploy Completo

A veces Railway no inyecta las variables hasta que haces un redeploy completo.

**Solución:**
1. Ve a **"Deployments"**
2. Haz clic en los **3 puntos** (⋯) del deployment más reciente
3. Selecciona **"Redeploy"** o **"Deploy"**
4. Espera a que termine completamente
5. Revisa los logs

### 4. ⚠️ Railway Runtime V2

Si estás usando Railway Runtime V2 (beta), puede haber problemas con las variables.

**Solución:**
1. Ve a **"Settings"** de tu servicio
2. Busca la opción **"Runtime"** o **"Runtime Version"**
3. Si está en V2, intenta cambiarlo a V1 (o viceversa)
4. Haz un redeploy

### 5. ⚠️ Formato del Valor

A veces hay espacios o caracteres invisibles.

**Solución:**
1. Elimina la variable `TELEGRAM_BOT_TOKEN`
2. Crea una nueva con el nombre exacto: `TELEGRAM_BOT_TOKEN`
3. Pega el token directamente desde BotFather (sin espacios)
4. Guarda
5. Haz un redeploy

## Pasos Recomendados (En Orden)

### Paso 1: Verificar Ubicación de la Variable

1. Ve a Railway → Tu Proyecto → Tu Servicio
2. Pestaña **"Variables"**
3. Busca `TELEGRAM_BOT_TOKEN`
4. **Verifica que esté en "Service Variables"** (no en "Shared" o "Project")

### Paso 2: Eliminar y Recrear

1. **Elimina** `TELEGRAM_BOT_TOKEN` completamente
2. Haz clic en **"+ New Variable"**
3. Nombre: `TELEGRAM_BOT_TOKEN` (exactamente así, sin espacios)
4. Valor: Pega tu token directamente (sin espacios al inicio/final)
5. **NO** marques como "Secret" si ya lo está (o viceversa, prueba ambos)
6. Guarda

### Paso 3: Redeploy Completo

1. Ve a **"Deployments"**
2. Haz clic en **"Redeploy"** o **"Deploy"**
3. Espera a que termine (puede tardar 2-3 minutos)
4. **NO** canceles el proceso

### Paso 4: Verificar Logs

Después del redeploy, los logs deberían mostrar:
- `✅ TELEGRAM_BOT_TOKEN detectado correctamente`
- Si sigue fallando, verás información detallada de debug

## Verificación Rápida

En los logs de Railway, busca:

✅ **Si funciona:**
```
✅ TELEGRAM_BOT_TOKEN detectado correctamente (longitud: XX caracteres)
```

❌ **Si no funciona:**
```
❌ ERROR: TELEGRAM_BOT_TOKEN no está disponible en el proceso
ENV_DEBUG_KEYS encontradas: [...]
```

## Solución Alternativa: Usar railway.json

Si nada funciona, puedes intentar forzar las variables en `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

**Nota:** Railway debería inyectar las variables automáticamente, pero a veces hay problemas.

## Contactar Soporte de Railway

Si después de todos estos pasos sigue sin funcionar:

1. Ve a Railway → Settings → Support
2. Explica que la variable está configurada pero no se inyecta al contenedor
3. Incluye:
   - Screenshot de las variables configuradas
   - Logs del error
   - Nombre del servicio y proyecto

## Checklist Final

Antes de contactar soporte, verifica:

- [ ] Variable está en **Service Variables** (no Project)
- [ ] Nombre es exactamente `TELEGRAM_BOT_TOKEN` (sin espacios)
- [ ] Valor no tiene espacios al inicio/final
- [ ] Hiciste un **redeploy completo** después de agregar/modificar
- [ ] Estás en el entorno correcto (production/preview)
- [ ] Revisaste los logs después del redeploy
- [ ] El token es válido (puedes probarlo localmente)

## Prueba Local

Para verificar que el token funciona:

1. Crea un archivo `.env` local:
   ```
   TELEGRAM_BOT_TOKEN=7754946488:AAH74ULTX1dAsMMyCLOKmAfj-00ft4Uguyk
   ```

2. Instala `dotenv`: `npm install dotenv`

3. Prueba el bot localmente

Si funciona localmente pero no en Railway, el problema es definitivamente con la inyección de variables de Railway.
