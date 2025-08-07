#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando Bot de Telegram para Gestión de Pedidos...');

// Función para reiniciar el proceso si falla
function startBot() {
  console.log('📡 Conectando con Telegram...');
  
  const botProcess = spawn('node', ['index.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  botProcess.on('close', (code) => {
    console.log(`\n🛑 Bot terminado con código: ${code}`);
    
    if (code !== 0) {
      console.log('🔄 Reiniciando bot en 5 segundos...');
      setTimeout(startBot, 5000);
    } else {
      console.log('✅ Bot terminado correctamente');
      process.exit(0);
    }
  });

  botProcess.on('error', (error) => {
    console.error('❌ Error al iniciar el bot:', error.message);
    console.log('🔄 Reiniciando bot en 5 segundos...');
    setTimeout(startBot, 5000);
  });

  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\n🛑 Recibida señal SIGINT. Deteniendo bot...');
    botProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Recibida señal SIGTERM. Deteniendo bot...');
    botProcess.kill('SIGTERM');
  });
}

// Iniciar el bot
startBot();
