# 🔧 Solución: Variables No Funcionan para Colaborador en Railway

## El Problema

Eres **colaborador** (no owner) del proyecto en Railway. Las variables están configuradas pero no se pasan al contenedor. En tu cuenta personal funciona, pero en la cuenta de colaborador no.

## Causa Probable

Railway puede tener problemas con variables cuando:
1. Las variables están en **"Shared Variables"** pero el colaborador no tiene acceso
2. Las variables están a nivel de **proyecto** pero no se heredan al servicio
3. Hay restricciones de permisos para colaboradores

## Soluciones (En Orden de Prioridad)

### Solución 1: Configurar Variables en el Servicio Específico ⭐ (RECOMENDADA)

Como colaborador, necesitas que las variables estén **directamente en el servicio**, no en "Shared Variables":

1. Ve a Railway → Tu Proyecto → **Tu Servicio** (el servicio específico que está fallando)
2. Pestaña **"Variables"**
3. Verifica que veas **"Service Variables"** (no "Shared Variables")
4. Si `TELEGRAM_BOT_TOKEN` está en "Shared Variables", necesitas:
   - **Opción A**: Pedirle al owner que la mueva a "Service Variables"
   - **Opción B**: Si tienes permisos, crear una nueva variable directamente en "Service Variables"

### Solución 2: Verificar Permisos del Colaborador

1. Pídele al **owner** del proyecto que verifique tus permisos
2. Debes tener permisos de **"Admin"** o **"Deploy"** para modificar variables
3. Si solo tienes permisos de "Viewer", no podrás ver/modificar variables

### Solución 3: Usar Variables de Entorno en el Código (Temporal)

Si no puedes modificar las variables en Railway, puedes hardcodear temporalmente el token (solo para testing):

**⚠️ ADVERTENCIA: Esto expone el token en el código. Solo para testing.**

```javascript
// TEMPORAL - Solo para testing
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7754946488:AAH74ULTX1dAsMMyCLOKmAfj-00ft4Uguyk';
```

**NO hagas commit de esto a producción.** Es solo para verificar que el problema es de Railway, no del código.

### Solución 4: Pedir al Owner que Configure las Variables

Si no tienes permisos suficientes:

1. Contacta al **owner** del proyecto
2. Pídele que:
   - Verifique que `TELEGRAM_BOT_TOKEN` esté en **"Service Variables"** (no Shared)
   - Verifique que esté en el **entorno correcto** (production/preview)
   - Haga un **redeploy completo** después de verificar

### Solución 5: Crear un Servicio Nuevo (Si Tienes Permisos)

Si tienes permisos de Admin:

1. Crea un **nuevo servicio** en el mismo proyecto
2. Configura las variables directamente en ese servicio
3. Apunta el servicio al mismo código
4. Prueba si funciona

## Verificación Rápida

### Como Colaborador, Verifica:

1. **¿Puedes ver las variables?**
   - Ve a Servicio → Variables
   - Si NO puedes ver la pestaña "Variables", no tienes permisos suficientes

2. **¿Dónde están las variables?**
   - Si están en "Shared Variables" → Problema de permisos/herencia
   - Si están en "Service Variables" → Deberían funcionar

3. **¿Puedes editar las variables?**
   - Si NO puedes editar → No tienes permisos de Admin/Deploy

## Pasos Específicos para Colaborador

### Paso 1: Verificar Permisos

1. Ve a Railway → Tu Proyecto → Settings → Team
2. Verifica tu rol:
   - ✅ **Admin**: Puedes modificar variables
   - ✅ **Deploy**: Puedes modificar variables del servicio
   - ❌ **Viewer**: NO puedes modificar variables

### Paso 2: Verificar Ubicación de Variables

1. Ve a Servicio → Variables
2. Busca `TELEGRAM_BOT_TOKEN`
3. Verifica si está en:
   - **"Service Variables"** → ✅ Debería funcionar
   - **"Shared Variables"** → ❌ Puede no funcionar para colaboradores

### Paso 3: Si No Tienes Permisos

Contacta al owner y pídele que:

```
Hola, necesito que verifiques las variables de entorno en Railway:

1. Ve a [Nombre del Servicio] → Variables
2. Verifica que TELEGRAM_BOT_TOKEN esté en "Service Variables" (no Shared)
3. Verifica que esté en el entorno "production"
4. Haz un redeploy completo del servicio

El bot no está detectando las variables aunque están configuradas.
```

## Solución Definitiva

La mejor solución es que el **owner** configure las variables correctamente:

1. **Owner** va a Servicio → Variables
2. Verifica que `TELEGRAM_BOT_TOKEN` esté en **"Service Variables"**
3. Si está en "Shared Variables", la mueve a "Service Variables"
4. Hace un **redeploy completo**

## Alternativa: Usar Railway CLI

Si tienes acceso, puedes configurar variables desde la línea de comandos:

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Configurar variable
railway variables set TELEGRAM_BOT_TOKEN=7754946488:AAH74ULTX1dAsMMyCLOKmAfj-00ft4Uguyk
```

Esto puede funcionar incluso si no tienes permisos completos en la UI.

## Resumen

**El problema más común para colaboradores:**
- Variables en "Shared Variables" en lugar de "Service Variables"
- Falta de permisos para ver/modificar variables
- Variables en el entorno incorrecto

**Solución más rápida:**
- Pedir al owner que mueva las variables a "Service Variables"
- O pedir permisos de Admin/Deploy
