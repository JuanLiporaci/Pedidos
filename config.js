// Configuración del bot de Telegram
module.exports = {
  // Configuración del bot
  bot: {
    polling: {
      interval: 300, // Intervalo de polling en ms
      autoStart: true,
      params: {
        timeout: 10 // Timeout para requests
      }
    },
    request: {
      timeout: 30000, // Timeout de 30 segundos para requests
      proxy: null // No usar proxy por defecto
    },
    webHook: false,
    errorHandler: (error) => {
      console.error('Error general del bot:', error);
    }
  },

  // Configuración de reconexión
  reconnection: {
    maxAttempts: 5,
    delayBetweenAttempts: 5000, // 5 segundos
    delayBeforeRestart: 2000 // 2 segundos
  },

  // Configuración de limpieza de estados
  cleanup: {
    stateTimeout: 30 * 60 * 1000, // 30 minutos
    cleanupInterval: 15 * 60 * 1000 // 15 minutos
  },

  // Configuración de mensajes
  messages: {
    maxLength: 4000,
    delayBetweenParts: 100 // ms entre partes de mensajes largos
  },

  // Configuración de rate limiting
  rateLimit: {
    maxMessagesPerSecond: 30,
    delayBetweenMessages: 50 // ms
  }
};
