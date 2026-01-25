const { productosData, direccionesData, obtenerSimilitud, buscarDireccion } = require('../utils');
const { guardarEnSheets } = require('./cargardatos');

async function modificarPedido(chatId, estado, texto) {
  switch (estado.paso) {
    case 'producto':
      const encontrados = productosData.map(p => {
        const score = Math.max(
          obtenerSimilitud(texto, p.memo),
          obtenerSimilitud(texto, p.otra || ''),
          obtenerSimilitud(texto, p.full || '')
        );
        return { ...p, score };
      }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

      if (encontrados.length > 0) {
        estado.opciones = encontrados;
        estado.paso = 'esperandoSeleccion';
        const opciones = encontrados.map((p, i) => `${i + 1}. ${p.memo}`).join('\n');
        return bot.sendMessage(chatId, `${opciones}\n\n🔍 Selecciona un producto escribiendo su número o escribe directamente el producto si no aparece:`);
      } else {
        estado.paso = 'productoSinCoincidencia';
        estado.entradaManual = texto;
        return bot.sendMessage(chatId, '❌ No se encontró ninguna coincidencia.\n¿Qué deseas hacer?\n1️⃣ Buscar otra vez\n2️⃣ Escribir producto manual');
      }

    // Agregar más casos según lo necesites, por ejemplo 'cantidad', 'fecha', etc.

    case 'cantidad':
      if (!/^[0-9]+$/.test(texto)) {
        return bot.sendMessage(chatId, '❌ Por favor ingresa una cantidad válida.');
      }
      estado.cantidades.push(texto);
      estado.paso = 'agregarOtro';
      return bot.sendMessage(chatId, '¿Qué deseas hacer ahora?\n1️⃣ Añadir otro producto\n2️⃣ Finalizar productos\n3️⃣ Eliminar producto');
  }
}

module.exports = { modificarPedido };
