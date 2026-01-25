# 🔧 Solución: Railway Runtime V2 y Variables de Entorno

## El Problema

Tienes `RAILWAY_BETA_ENABLE_RUNTIME_V2` activado y las variables están en "Service Variables" pero no se detectan. Este es un **bug conocido de Railway Runtime V2**.

## Solución 1: Desactivar Railway Runtime V2 ⭐ (RECOMENDADA)

Railway Runtime V2 es beta y tiene problemas conocidos con variables de entorno.

### Pasos:

1. Ve a Railway → Tu Servicio → **"Settings"**
2. Busca la sección **"Runtime"** o **"Runtime Version"**
3. Si ves **"Runtime V2"** o **"Beta Runtime"**, cámbialo a **"Runtime V1"** o desactívalo
4. Guarda los cambios
5. Ve a **"Deployments"** → Haz un **"Redeploy"** completo
6. Espera a que termine y verifica los logs

### Alternativa: Desactivar desde Variables

1. Ve a Railway → Tu Servicio → **"Variables"**
2. Busca la variable `RAILWAY_BETA_ENABLE_RUNTIME_V2`
3. **Elimínala** o cámbiala a `false`
4. Haz un redeploy completo

## Solución 2: Usar Railway CLI para Configurar Variables

Si Runtime V2 sigue causando problemas, usa Railway CLI:

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Navegar al proyecto
cd tu-proyecto

# Configurar variable (esto fuerza la inyección)
railway variables set TELEGRAM_BOT_TOKEN=7754946488:AAH74ULTX1dAsMMyCLOKmAfj-00ft4Uguyk --service tu-servicio
```

## Solución 3: Verificar el Valor Exacto de la Variable

A veces el problema es que el valor tiene caracteres invisibles:

1. En Railway, haz clic en `TELEGRAM_BOT_TOKEN`
2. Haz clic en el **icono del ojo** para ver el valor
3. **Copia todo el valor** (Ctrl+A, Ctrl+C)
4. **Elimina la variable**
5. **Crea una nueva** con el mismo nombre
6. **Pega el valor** directamente (sin editar)
7. Guarda y haz redeploy

## Solución 4: Verificar Entorno

Railway Runtime V2 puede tener diferentes entornos:

1. En la pestaña **"Variables"**, verifica el selector de entorno arriba
2. Asegúrate de estar en **"production"** (no "preview" u otro)
3. Verifica que la variable esté en ese entorno específico

## Solución 5: Crear un Nuevo Servicio (Último Recurso)

Si nada funciona:

1. Crea un **nuevo servicio** en el mismo proyecto
2. **NO** actives Runtime V2 en el nuevo servicio
3. Configura las variables en el nuevo servicio
4. Apunta el nuevo servicio al mismo código/repositorio
5. Prueba si funciona

## Verificación

Después de desactivar Runtime V2 y hacer redeploy, los logs deberían mostrar:

```
✅ TELEGRAM_BOT_TOKEN detectado correctamente (longitud: XX caracteres)
```

Si sigue fallando, el código mejorado mostrará información detallada de debug.

## Nota Importante

Railway Runtime V2 es **beta** y tiene bugs conocidos. Para producción, se recomienda usar **Runtime V1** hasta que V2 esté estable.

## Pasos Recomendados (En Orden)

1. ✅ **Desactiva Railway Runtime V2** (Settings → Runtime)
2. ✅ **Elimina la variable** `RAILWAY_BETA_ENABLE_RUNTIME_V2` si existe
3. ✅ **Haz un redeploy completo**
4. ✅ **Verifica los logs** - debería funcionar ahora

Si después de estos pasos sigue sin funcionar, puede ser un problema más profundo de Railway y deberías contactar su soporte.
