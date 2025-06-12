# Bot de Telegram para Gestión de Pedidos

Este bot permite gestionar pedidos a través de Telegram, guardando la información en Google Sheets.

## Características

- Registro de pedidos con nombre del cliente, productos y cantidades
- Gestión de pedidos existentes (modificar, eliminar)
- Búsqueda inteligente de productos
- Guardado automático en Google Sheets
- Hojas individuales para cada usuario

## Requisitos

- Node.js
- Una cuenta de Telegram
- Una cuenta de Google Cloud con API de Google Sheets habilitada
- Un bot de Telegram (creado a través de BotFather)

## Configuración

### Variables de entorno

El bot utiliza las siguientes variables de entorno:

- `TELEGRAM_BOT_TOKEN`: Token del bot de Telegram
- `SPREADSHEET_ID`: ID de la hoja de Google Sheets
- `GOOGLE_CREDENTIALS`: Credenciales de Google Cloud en formato JSON (codificadas en base64)

### Configuración local

1. Clona este repositorio
2. Instala las dependencias: `npm install`
3. Crea un archivo `.env` con las variables de entorno
4. Ejecuta el bot: `npm start`

### Despliegue en Railway

1. Crea una cuenta en [Railway](https://railway.app)
2. Vincula tu repositorio de GitHub con Railway
3. Configura las variables de entorno en Railway:
   - `TELEGRAM_BOT_TOKEN`
   - `SPREADSHEET_ID`
   - `GOOGLE_CREDENTIALS` (contenido del archivo credentials.json en base64)
4. Railway detectará automáticamente el comando `npm start` definido en package.json

## Estructura de la hoja de Google Sheets

El bot espera encontrar las siguientes hojas en el Google Sheet:

- `Pedidos`: Hoja principal donde se guardan todos los pedidos
- `Catalogo`: Catálogo de productos disponibles
- `Direcciones`: Direcciones de clientes
- `Circuit`: Información para entregas
- Una hoja individual para cada usuario que realiza pedidos (se crea automáticamente)

## Comandos del bot

- `/start`: Iniciar interacción con el bot
- `000`: Reiniciar el bot en cualquier momento

<!-- Dummy commit para forzar redeploy en Railway --> 