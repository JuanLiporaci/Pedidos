const TelegramBot = require('node-telegram-bot-api');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');
const config = require('./config');

// Configuración de variables de entorno
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN no está configurado. Define la variable de entorno en Railway o localmente.');
}
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1CNyD_seHZZyB-2NPusYEpNGF8m5LzUz87RHIYitfnAU';

// Configuración de credenciales de Google
let GOOGLE_CREDENTIALS;
try {
  if (process.env.GOOGLE_CREDENTIALS) {
    // En producción, las credenciales están en variable de entorno
    GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('Usando credenciales desde variable de entorno');
  } else {
    // En desarrollo, las credenciales están en archivo local
    GOOGLE_CREDENTIALS = require('./credentials.json');
    console.log('Usando credenciales desde archivo local');
  }
} catch (error) {
  console.error('Error al cargar credenciales:', error);
  // Credenciales de respaldo para pruebas (no funcionarán en producción)
  GOOGLE_CREDENTIALS = {
    type: 'service_account',
    project_id: 'proyecto-demo',
    client_email: 'ejemplo@proyecto-demo.iam.gserviceaccount.com'
  };
  console.warn('Usando credenciales de respaldo (solo para desarrollo)');
}

// Configuración del bot usando el archivo de configuración
const botOptions = config.bot;

// Inicializar el bot con configuración mejorada
const bot = new TelegramBot(TOKEN, botOptions);

// Variable para controlar el estado del bot
let botRunning = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = config.reconnection.maxAttempts;

// Función para reiniciar el bot de forma segura
async function restartBot() {
  if (botRunning) {
    console.log('Deteniendo bot actual...');
    try {
      await bot.stopPolling();
      botRunning = false;
    } catch (error) {
      console.error('Error al detener bot:', error);
    }
  }
  
  // Esperar un momento antes de reiniciar
  await new Promise(resolve => setTimeout(resolve, config.reconnection.delayBeforeRestart));
  
  console.log('Reiniciando bot...');
  try {
    await bot.startPolling(botOptions.polling);
    botRunning = true;
    reconnectAttempts = 0;
    console.log('Bot reiniciado exitosamente');
  } catch (error) {
    console.error('Error al reiniciar bot:', error);
    reconnectAttempts++;
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      console.log(`Intento de reconexión ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} en ${config.reconnection.delayBetweenAttempts/1000} segundos...`);
      setTimeout(restartBot, config.reconnection.delayBetweenAttempts);
    } else {
      console.error('Se alcanzó el máximo de intentos de reconexión. Deteniendo bot.');
      process.exit(1);
    }
  }
}

// Manejar errores de conexión mejorado
bot.on('polling_error', (error) => {
  console.error('Error en el polling de Telegram:', error.message);
  
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    console.log('Error de conexión temporal. Intentando reconectar...');
    if (!botRunning) {
      restartBot();
    }
  } else if (error.code === 'ENOTFOUND') {
    console.error('No se pudo resolver el host. Verifica la conexión a internet.');
  } else if (error.response && error.response.statusCode === 401) {
    console.error('Error de autenticación. Verifica el TOKEN del bot.');
    process.exit(1);
  } else if (error.response && error.response.statusCode === 409) {
    console.error('Conflicto de actualización: otro proceso ya está usando este bot.');
    console.log('Deteniendo bot actual...');
    process.exit(1);
  } else {
    console.error('Error desconocido en el polling:', error.message);
    // Solo reiniciar si no es un error crítico
    if (!botRunning && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      restartBot();
    }
  }
});

// Evento cuando el bot se conecta exitosamente
bot.on('polling_start', () => {
  console.log('✅ Bot iniciado correctamente - Polling activo');
  botRunning = true;
});

// Evento cuando el bot se desconecta
bot.on('polling_stop', () => {
  console.log('🛑 Bot detenido - Polling inactivo');
  botRunning = false;
});

// Manejar señales de terminación del proceso
process.on('SIGINT', async () => {
  console.log('\n🛑 Recibida señal SIGINT. Deteniendo bot...');
  try {
    await bot.stopPolling();
    console.log('Bot detenido correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al detener bot:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recibida señal SIGTERM. Deteniendo bot...');
  try {
    await bot.stopPolling();
    console.log('Bot detenido correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al detener bot:', error);
    process.exit(1);
  }
});

// Variables para almacenar datos
const estados = {};
let productosData = [];
let direccionesData = [];

// Función para limpiar estados antiguos (evitar acumulación de memoria)
function limpiarEstadosAntiguos() {
  const ahora = Date.now();
  const TIEMPO_LIMITE = config.cleanup.stateTimeout;
  
  Object.keys(estados).forEach(chatId => {
    if (!estados[chatId].ultimaActividad || 
        (ahora - estados[chatId].ultimaActividad) > TIEMPO_LIMITE) {
      console.log(`Limpiando estado antiguo para chat ${chatId}`);
      delete estados[chatId];
    }
  });
}

// Ejecutar limpieza según la configuración
setInterval(limpiarEstadosAntiguos, config.cleanup.cleanupInterval);

// Función para normalizar texto
function normalizar(texto) {
  return texto.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/gi, ' ')  // Preservar guiones y espacios
    .trim()
    .replace(/\s+/g, ' ')        // Normalizar espacios múltiples
    .replace(/15-40/g, '15w40')
    .replace(/15w-40/g, '15w40')
    .replace(/5w-30/g, '5w30')
    .replace(/10w-30/g, '10w30')
    .replace(/10w-40/g, '10w40')
    .replace(/20w-50/g, '20w50')
    .replace(/5w-20/g, '5w20')
    .replace(/80-90/g, '80w90')
    .replace(/85-140/g, '85w140');
}

// Función de similitud de texto mejorada
function obtenerSimilitud(str1, str2) {
  const s1 = normalizar(str1);
  const s2 = normalizar(str2);
  
  // Si alguna cadena está vacía, retornar 0
  if (!s1 || !s2) return 0;

  // Comprobación simple de contención
  if (s2.includes(s1) || s1.includes(s2)) {
    return 0.9; // Aumentar puntaje para coincidencias directas
  }

  // Dividir en palabras y filtrar palabras vacías
  const words1 = s1.split(' ').filter(w => w.length > 0);
  const words2 = s2.split(' ').filter(w => w.length > 0);
  
  // Método simple de intersección
  const exactMatches = words1.filter(w => words2.includes(w)).length;
  let similarityScore = exactMatches / Math.max(words1.length, 1);
  
  // Si el puntaje es bajo, intentar con el método más detallado
  if (similarityScore < 0.3) {
    // Contar coincidencias
    let matches = 0;
    
    for (const word1 of words1) {
      // Coincidencia exacta
      if (words2.includes(word1)) {
        matches += 1;
        continue;
      }
      
      // Coincidencia parcial
      for (const word2 of words2) {
        // Coincidencia especial para SAE y grados
        if ((word1 === 'sae' && /^\d+w\d+$/.test(word2)) ||
            (/^\d+w\d+$/.test(word1) && word1 === word2)) {
          matches += 1;
          break;
        }
        
        // Coincidencia parcial mejorada
        if (word2.includes(word1) || word1.includes(word2)) {
          // Dar mayor peso a coincidencias más largas
          const minLength = Math.min(word1.length, word2.length);
          const matchScore = minLength > 2 ? 0.8 : 0.5;
          matches += matchScore;
          break;
        }
      }
    }
    
    // Calcular score final con método detallado
    const detailedScore = matches / Math.max(words1.length, 1);
    
    // Usar el mejor de los dos puntajes
    similarityScore = Math.max(similarityScore, detailedScore);
  }
  
  return similarityScore;
}

// Función mejorada para buscar productos
function buscarProductos(query) {
  if (!query || query.trim() === '') return [];
  
  const queryNormalizado = normalizar(query);
  console.log(`Buscando: "${query}" (normalizado: "${queryNormalizado}")`);
  
  const resultados = productosData.map(producto => {
    // Calcular similitud con todas las descripciones
    const scoreMemo = obtenerSimilitud(query, producto.memo || '');
    const scoreOtra = obtenerSimilitud(query, producto.otra || '');
    const scoreFull = obtenerSimilitud(query, producto.full || '');
    const scoreCodigo = obtenerSimilitud(query, producto.codigo || '');
    
    // Usar el mejor score
    const scoreFinal = Math.max(scoreMemo, scoreOtra, scoreFull, scoreCodigo);
    
    // Bonus para coincidencias exactas
    if (normalizar(producto.memo).includes(queryNormalizado) || 
        normalizar(producto.otra).includes(queryNormalizado) ||
        normalizar(producto.full).includes(queryNormalizado) ||
        normalizar(producto.codigo).includes(queryNormalizado)) {
      return { ...producto, score: scoreFinal + 0.2 };
    }
    
    return { ...producto, score: scoreFinal };
  }).filter(p => p.score > 0.1); // Umbral más bajo para capturar más resultados
  
  // Ordenar por score y limitar resultados
  return resultados.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Función para filtrar resultados simplificada
function filtrarResultados(resultados, query) {
  // Usar un umbral más permisivo
  const filtrados = resultados.filter(r => r.score > 0.05); // Reducido de 0.1 a 0.05
  
  // Ordenar por score
  const ordenados = filtrados.sort((a, b) => b.score - a.score);
  
  // Retornar hasta 10 resultados
  return ordenados.slice(0, 10);
}

// Función para determinar la especificidad de la búsqueda
function obtenerEspecificidad(query) {
  const normalizado = normalizar(query);
  let especificidad = 0;

  // Si contiene un grado de viscosidad específico
  if (/\d+w\d+|\d+-\d+/.test(normalizado)) {
    especificidad += 0.4;
  }

  // Si contiene "sae"
  if (normalizado.includes('sae')) {
    especificidad += 0.2;
  }

  // Si contiene una marca específica
  const marcas = ['mobil', 'shell', 'chevron', 'delo', 'rotella', 'mistyk', 'black'];
  if (marcas.some(marca => normalizado.includes(marca))) {
    especificidad += 0.3;
  }

  // Por cada palabra adicional (más específico)
  const palabras = normalizado.split(' ').filter(p => p.length > 2);
  especificidad += Math.min(0.1 * (palabras.length - 1), 0.3);

  return Math.min(especificidad, 1);
}

// Cargar datos iniciales
async function cargarDatos() {
  try {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth(GOOGLE_CREDENTIALS);
    await doc.loadInfo();

    // Cargar productos
    const catalogo = doc.sheetsByTitle['Catalogo'];
    const productos = await catalogo.getRows();
    productosData = productos.map(row => ({
      codigo: row['Product/Service'],
      memo: row['Memo/Description'],
      otra: row['otra descripcion'],
      full: row['Product/Service full name']
    })).filter(p => p.memo);

    // Cargar direcciones
    const direccionesSheet = doc.sheetsByTitle['Direcciones'];
    const direcciones = await direccionesSheet.getRows();
    direccionesData = direcciones.map(row => ({
      nombre: row['Customer full name'],
      direccion: row['Bill address']
    })).filter(d => d.nombre && d.direccion);

    console.log('Datos cargados exitosamente');
  } catch (error) {
    console.error('Error al cargar datos:', error);
    
    // Verificar si es un error de credenciales
    if (error.message && error.message.includes('Invalid JWT Signature')) {
      console.error('❌ ERROR DE CREDENCIALES: Las credenciales de Google están inválidas');
      console.error('💡 Solución: Regenera las credenciales en Google Cloud Console');
      console.error('📖 Ver archivo fix-credentials.md para instrucciones');
    } else if (error.message && error.message.includes('invalid_grant')) {
      console.error('❌ ERROR DE AUTENTICACIÓN: Token de Google inválido');
      console.error('💡 Solución: Verifica las credenciales en Railway');
    }
    
    // Si hay un error, cargar algunos productos predeterminados para que la búsqueda funcione
    productosData = [
      { codigo: 'MOIL15W40', memo: 'Mobil Delvac MX 15W40 Galon', otra: 'Aceite Mobil Delvac 15W40 SAE', full: 'Mobil Delvac MX ESP 15W40' },
      { codigo: 'MOIL5W30', memo: 'Mobil Super 5W30 Galon', otra: 'Aceite Mobil Super 5000 5W30 SAE', full: 'Mobil Super 5W30' },
      { codigo: 'SHELL15W40', memo: 'Shell Rotella T4 15W40 Galon', otra: 'Aceite Shell Rotella T4 SAE 15W40', full: 'Shell Rotella T4 15W40' },
      { codigo: 'CBXM', memo: 'Caja de Mistyk', otra: 'Caja completa Mistyk', full: 'Caja Mistyk 12 unidades' },
      { codigo: 'DELO400', memo: 'Chevron Delo 400 LE 15W40 Galon', otra: 'Aceite Chevron Delo 400 SAE 15W40', full: 'Chevron Delo 400 LE 15W40' },
      { codigo: 'BKBLG', memo: 'Black Gold 15W40 Galon', otra: 'Aceite Black Gold SAE 15W40', full: 'Black Gold 15W40' },
      { codigo: 'DELO15W40', memo: 'Chevron Delo 600 ADF 15W40 Galon', otra: 'Aceite Chevron Delo 600 ADF SAE 15W40', full: 'Chevron Delo 600 ADF 15W40' },
      { codigo: 'SAE90', memo: 'Valvoline SAE 90 Galon', otra: 'Aceite Valvoline SAE 90', full: 'Valvoline SAE 90' },
      { codigo: 'SAE140', memo: 'Valvoline SAE 140 Galon', otra: 'Aceite Valvoline SAE 140', full: 'Valvoline SAE 140' },
      { codigo: 'HIDRAULICO', memo: 'Aceite Hidraulico AW68', otra: 'Aceite Hidraulico AW 68', full: 'Aceite Hidraulico AW68' },
      { codigo: 'COOLANT', memo: 'Coolant/Anticongelante', otra: 'Líquido refrigerante', full: 'Coolant Anticongelante' },
      { codigo: 'MISTYK', memo: 'Mistyk', otra: 'Producto Mistyk', full: 'Mistyk' },
      { codigo: 'ACEITE', memo: 'Aceite', otra: 'Aceite lubricante', full: 'Aceite' },
      { codigo: 'ROTELLA', memo: 'Rotella', otra: 'Aceite Rotella', full: 'Rotella' },
      { codigo: 'DELO', memo: 'Delo', otra: 'Aceite Delo', full: 'Delo' },
      { codigo: 'MOBIL', memo: 'Mobil', otra: 'Aceite Mobil', full: 'Mobil' },
      { codigo: 'SHELL', memo: 'Shell', otra: 'Aceite Shell', full: 'Shell' },
      { codigo: 'VALVOLINE', memo: 'Valvoline', otra: 'Aceite Valvoline', full: 'Valvoline' },
      { codigo: 'CHEVRON', memo: 'Chevron', otra: 'Aceite Chevron', full: 'Chevron' },
      { codigo: 'BLACKGOLD', memo: 'Black Gold', otra: 'Aceite Black Gold', full: 'Black Gold' }
    ];
    
    // Cargar algunas direcciones predeterminadas
    direccionesData = [
      { nombre: 'ABC Trucking', direccion: '123 Main St, Austin, TX' },
      { nombre: 'Transportes XYZ', direccion: '456 Oak St, Houston, TX' },
      { nombre: 'Logistica Rapida', direccion: '789 Pine Ave, Dallas, TX' }
    ];
    
    console.log('Cargados datos predeterminados debido a error de conexión');
  }
}

// Buscar dirección con mejoras
function buscarDireccion(cliente) {
  // Si no hay cliente o está vacío, devolver string vacío
  if (!cliente || cliente.trim() === '') return '';

  // Normalizar el nombre del cliente para la búsqueda
  const clienteNormalizado = normalizar(cliente);
  
  // Mapear direcciones con scores
  const direccionesConScore = direccionesData.map(dir => {
    // Usar múltiples métodos para calcular la similitud
    const scorePorPalabras = obtenerSimilitud(cliente, dir.nombre);
    
    // Verificar si hay coincidencia exacta de alguna parte del nombre
    const palabrasCliente = clienteNormalizado.split(' ').filter(p => p.length > 2);
    const palabrasDir = normalizar(dir.nombre).split(' ').filter(p => p.length > 2);
    
    // Buscar palabras específicas que coincidan exactamente
    const coincidenciasExactas = palabrasCliente.filter(p => palabrasDir.includes(p)).length;
    const scorePorCoincidencias = coincidenciasExactas / Math.max(palabrasCliente.length, 1);
    
    // Usar el mejor score
    const scoreFinal = Math.max(scorePorPalabras, scorePorCoincidencias);
    
    return {
      ...dir,
      score: scoreFinal
    };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score);

  // Si hay resultados, devolver la mejor coincidencia
  return direccionesConScore.length > 0 ? direccionesConScore[0].direccion : '';
}

// Guardar nuevo pedido
async function guardarEnSheets(data) {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth(GOOGLE_CREDENTIALS);
  await doc.loadInfo();
  const sheetPedidos = doc.sheetsByTitle['Pedidos'];
  const rows = await sheetPedidos.getRows();

  // Definir los campos relevantes
  const campos = [
    'Nombre del Cliente',
    'Productos',
    'Cantidad',
    'Fecha de Despacho',
    'Notas',
    'Usuario',
    'codigo'
  ];

  // Buscar la primera fila vacía
  let filaVacia = null;
  for (const row of rows) {
    const vacia = campos.every(campo => !row[campo] || row[campo].toString().trim() === '');
    if (vacia) {
      filaVacia = row;
      break;
    }
  }

  // Fecha actual para el registro
  const fechaSubida = moment().format('MM/DD/YYYY HH:mm:ss');

  if (filaVacia) {
    // Si hay una fila vacía, la rellenamos
    filaVacia['Nombre del Cliente'] = data.nombre;
    filaVacia['Productos'] = data.productos.join('\n');
    filaVacia['Cantidad'] = data.cantidades.join('\n');
    filaVacia['Fecha de Despacho'] = data.fecha;
    filaVacia['Notas'] = data.nota || '';
    filaVacia['Usuario'] = data.usuario;
    filaVacia['codigo'] = data.codigos.join('\n');
    await filaVacia.save();
  } else {
    // Si no hay filas vacías, agregamos una nueva
    await sheetPedidos.addRow({
      'Nombre del Cliente': data.nombre,
      'Productos': data.productos.join('\n'),
      'Cantidad': data.cantidades.join('\n'),
      'Fecha de Despacho': data.fecha,
      'Notas': data.nota || '',
      'Usuario': data.usuario,
      'codigo': data.codigos.join('\n')
    });
  }

  // Circuit siempre se agrega al final
  const hojaCircuit = doc.sheetsByTitle['Circuit'];
  await hojaCircuit.addRow({
    'Address/Company Name': data.nombre,
    'Address line 1': data.direccionManual || buscarDireccion(data.nombre),
    'Internal notes': data.productos.map((p, i) => `${p} (${data.cantidades[i]})`).join(', '),
    'seller': data.usuario,
    'Driver (email or phone number)': ''
  });

  // Verificar si existe una hoja para el usuario
  let hojaUsuario;
  try {
    hojaUsuario = doc.sheetsByTitle[data.usuario];
  } catch (error) {
    // La hoja no existe
    hojaUsuario = null;
  }

  // Si no existe una hoja para el usuario, crearla con los encabezados
  if (!hojaUsuario) {
    hojaUsuario = await doc.addSheet({
      title: data.usuario,
      headerValues: [
        'Nombre del Cliente',
        'Productos',
        'Cantidad',
        'Fecha de Despacho',
        'codigo',
        'Notas',
        'Usuario',
        'Fecha de subida'
      ]
    });
  }

  // Agregar el pedido a la hoja del usuario
  await hojaUsuario.addRow({
    'Nombre del Cliente': data.nombre,
    'Productos': data.productos.join('\n'),
    'Cantidad': data.cantidades.join('\n'),
    'Fecha de Despacho': data.fecha,
    'codigo': data.codigos.join('\n'),
    'Notas': data.nota || '',
    'Usuario': data.usuario,
    'Fecha de subida': fechaSubida
  });
}

// Obtener pedidos del usuario
async function obtenerPedidosUsuario(usuario) {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth(GOOGLE_CREDENTIALS);
  await doc.loadInfo();
  const sheetPedidos = doc.sheetsByTitle['Pedidos'];
  
  const rows = await sheetPedidos.getRows();
  
  return rows
    .map((row, index) => ({
      rowIndex: index,
      nombre: row['Nombre del Cliente'],
      fecha: row['Fecha de Despacho'],
      usuario: row['Usuario']
    }))
    .filter(p => p.usuario === usuario);
}

// Eliminar pedido
async function eliminarPedido(rowIndex) {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth(GOOGLE_CREDENTIALS);
  await doc.loadInfo();
  const sheetPedidos = doc.sheetsByTitle['Pedidos'];
  const rows = await sheetPedidos.getRows();
  
  if (rowIndex >= 0 && rowIndex < rows.length) {
    // Obtener datos del pedido antes de eliminarlo
    const pedido = rows[rowIndex];
    const nombreCliente = pedido['Nombre del Cliente'];
    const usuario = pedido['Usuario'];
    
    // Eliminar de la hoja principal
    await rows[rowIndex].delete();
    
    // Eliminar de la hoja individual del usuario si existe
    if (usuario) {
      try {
        const hojaUsuario = doc.sheetsByTitle[usuario];
        if (hojaUsuario) {
          const filasUsuario = await hojaUsuario.getRows();
          // Buscar la fila correspondiente por nombre de cliente y fecha
          const filaAEliminar = filasUsuario.find(fila => 
            fila['Nombre del Cliente'] === nombreCliente &&
            fila['Fecha de Despacho'] === pedido['Fecha de Despacho']
          );
          
          if (filaAEliminar) {
            await filaAEliminar.delete();
          }
        }
      } catch (error) {
        console.error('Error al intentar eliminar de la hoja del usuario:', error);
        // Continuamos con la operación aunque falle esta parte
      }
    }
  } else {
    throw new Error(`Índice inválido: ${rowIndex}`);
  }
}

// Función auxiliar para enviar mensajes largos con manejo de errores
async function enviarMensajeLargo(chatId, texto, options = {}) {
  try {
    const MAX_LENGTH = config.messages.maxLength;
    
    if (texto.length <= MAX_LENGTH) {
      return await bot.sendMessage(chatId, texto, options);
    }

    // Dividir el texto en partes
    let partes = [];
    let currentPart = '';
    const lineas = texto.split('\n');

    for (const linea of lineas) {
      if (currentPart.length + linea.length + 1 > MAX_LENGTH) {
        partes.push(currentPart);
        currentPart = linea;
      } else {
        currentPart += (currentPart ? '\n' : '') + linea;
      }
    }
    if (currentPart) {
      partes.push(currentPart);
    }

    // Enviar cada parte con delay para evitar rate limiting
    for (let i = 0; i < partes.length; i++) {
      const esPrimeraParte = i === 0;
      const esUltimaParte = i === partes.length - 1;
      
      let mensaje = partes[i];
      if (!esPrimeraParte) {
        mensaje = '(continuación...)\n\n' + mensaje;
      }
      if (!esUltimaParte) {
        mensaje += '\n\n(continúa...)';
      }
      
      // Solo usar las opciones de formato en la última parte si hay botones
      const messageOptions = esUltimaParte ? options : { parse_mode: options.parse_mode };
      
      try {
        await bot.sendMessage(chatId, mensaje, messageOptions);
        // Pequeño delay entre mensajes para evitar rate limiting
        if (!esUltimaParte) {
          await new Promise(resolve => setTimeout(resolve, config.messages.delayBetweenParts));
        }
      } catch (error) {
        console.error(`Error al enviar parte ${i + 1} del mensaje:`, error.message);
        // Continuar con la siguiente parte
      }
    }
  } catch (error) {
    console.error('Error en enviarMensajeLargo:', error.message);
    // Intentar enviar un mensaje de error simple
    try {
      await bot.sendMessage(chatId, '❌ Error al enviar mensaje. Por favor, intenta nuevamente.');
    } catch (sendError) {
      console.error('Error al enviar mensaje de error:', sendError.message);
    }
  }
}

// Funciones auxiliares para manejar fechas y productos
function procesarFecha(texto) {
  const fechaHoy = new Date();
  const anioHoy = fechaHoy.getFullYear();
  const [mesPedido, diaPedido] = texto.split('/');

  if (!mesPedido || !diaPedido || 
      isNaN(mesPedido) || isNaN(diaPedido) || 
      mesPedido < 1 || mesPedido > 12 || 
      diaPedido < 1 || diaPedido > 31) {
    return { error: '❌ Fecha inválida. Usa el formato MM/DD.' };
  }

  const fechaDespacho = new Date(
    `${anioHoy}-${mesPedido.padStart(2, '0')}-${diaPedido.padStart(2, '0')}`
  );
  
  if (isNaN(fechaDespacho.getTime())) {
    return { error: '❌ Fecha inválida. Usa el formato MM/DD.' };
  }

  return {
    fecha: `${mesPedido.padStart(2, '0')}/${diaPedido.padStart(2, '0')}/${anioHoy}`,
    error: null
  };
}

function eliminarProducto(indice, productos, cantidades, codigos) {
  if (isNaN(indice) || indice < 0 || indice >= productos.length) {
    return { error: '❌ Número de producto inválido.' };
  }

  const eliminado = productos[indice];
  productos.splice(indice, 1);
  cantidades.splice(indice, 1);
  codigos.splice(indice, 1);

  return { eliminado, error: null };
}

// Helper function to create pedido object
function crearObjetoPedido(pedidoSeleccionado, nuevasFechas = {}) {
  return {
    rowIndex: pedidoSeleccionado.rowIndex,
    nombre: pedidoSeleccionado.nombre,
    productos: pedidoSeleccionado.productos,
    cantidades: pedidoSeleccionado.cantidades,
    fecha: nuevasFechas.fecha || pedidoSeleccionado.fecha,
    nota: pedidoSeleccionado.nota || '',
    usuario: pedidoSeleccionado.usuario,
    codigos: pedidoSeleccionado.codigos || []
  };
}

// Manejador de mensajes mejorado con control de redundancia
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text?.trim();
  const usuario = msg.from.username || msg.from.first_name || 'Desconocido';

  // Verificar que el bot esté funcionando
  if (!botRunning) {
    console.log('Bot no está ejecutándose, ignorando mensaje');
    return;
  }

  // Validar que el mensaje sea válido
  if (!texto || texto.length === 0) {
    return;
  }

  // Código de reinicio
  if (texto === '000') {
    delete estados[chatId];
    try {
      await bot.sendMessage(chatId, '🔄 Bot reiniciado.\n\n👋 ¿Qué deseas hacer?\n1️⃣ Hacer un nuevo pedido (paso a paso)\n2️⃣ Modificar un pedido viejo\n3️⃣ Nuevo pedido rápido');
    } catch (error) {
      console.error('Error al enviar mensaje de reinicio:', error.message);
    }
    return;
  }

  // Inicializar estado si no existe
  if (!estados[chatId]) {
    estados[chatId] = { paso: 'inicio' };
    try {
      await bot.sendMessage(chatId, '👋 ¿Qué deseas hacer?\n1️⃣ Hacer un nuevo pedido (paso a paso)\n2️⃣ Modificar un pedido viejo\n3️⃣ Nuevo pedido rápido');
    } catch (error) {
      console.error('Error al enviar mensaje inicial:', error.message);
    }
    return;
  }

  const estado = estados[chatId];
  
  // Registrar actividad del usuario
  estado.ultimaActividad = Date.now();

  // Variables para el switch
  let indiceAEliminar;
  let resultadoEliminar;
  let resultadoFecha;

  switch (estado.paso) {
    case 'inicio':
      if (texto === '1') {
        estados[chatId] = { paso: 'nombre', productos: [], cantidades: [], codigos: [] };
        bot.sendMessage(chatId, '📝 ¿Cuál es el nombre del cliente?');
      } else if (texto === '2') {
        estado.paso = 'cargandoPedidos';
        const pedidos = await obtenerPedidosUsuario(usuario);
        if (pedidos.length === 0) {
          delete estados[chatId];
          return bot.sendMessage(chatId, '❌ No tienes pedidos anteriores para modificar.');
        }
        estado.pedidos = pedidos;
        const lista = pedidos.map((p, i) => `${i + 1}. ${p.nombre} - ${p.fecha}`).join('\n');
        estado.paso = 'seleccionarPedido';
        bot.sendMessage(chatId, `📋 Tus pedidos:\n${lista}\n\nSelecciona el número del pedido a modificar:`);
      } else if (texto === '3') {
        estados[chatId] = { 
          paso: 'pedidoRapido',
          productos: [],
          cantidades: [],
          codigos: []
        };
        bot.sendMessage(chatId, 
          '📝 Envía el pedido completo en este formato:\n\n' +
          'Nombre del Cliente\n' +
          '* Producto1 cantidad\n' +
          '* Producto2 cantidad\n' +
          '* Producto3 cantidad\n' +
          'Dirección (opcional)\n\n' +
          'Ejemplo:\n' +
          'A&W Truck Service\n' +
          '* Paleta de Mistyk 1\n' +
          '* Delo 4\n' +
          '* Rotella T4 8\n' +
          '5401 Bernal Dr, Dallas, TX 75212'
        );
      }
      break;

    case 'pedidoRapido':
      try {
        // Dividir el texto en líneas
        const lineas = texto.split('\n').map(l => l.trim()).filter(l => l);
        if (lineas.length < 2) {
          return bot.sendMessage(chatId, '❌ Formato inválido. Necesito al menos el nombre del cliente y un producto.');
        }

        // Primera línea es el nombre del cliente
        const nombre = lineas[0];
        let direccionManual = '';
        let productos = [];
        let cantidades = [];
        let codigos = [];
        let productosNoEncontrados = [];

        // Procesar líneas de productos y última línea como dirección si no empieza con *
        for (let i = 1; i < lineas.length; i++) {
          const linea = lineas[i];
          if (linea.startsWith('*')) {
            // Es un producto
            const productoTexto = linea.substring(1).trim();
            const matches = productoTexto.match(/(.+?)\s+(\d+)$/);
            
            let nombreProducto, cantidad;
            if (matches) {
              nombreProducto = matches[1].trim();
              cantidad = matches[2];
            } else {
              nombreProducto = productoTexto;
              cantidad = '1';
            }

            // Buscar el producto en el catálogo usando la función de similitud mejorada
            const encontrados = productosData.map(p => {
              const scoreTexto = Math.max(
                obtenerSimilitud(nombreProducto, p.memo),
                obtenerSimilitud(nombreProducto, p.otra || ''),
                obtenerSimilitud(nombreProducto, p.full || '')
              );
              // Revisar si hay palabras claves exactas (como marcas o tipos)
              const textoNormalizado = normalizar(nombreProducto);
              const palabrasClave = textoNormalizado.split(' ').filter(w => w.length > 2);
              let scoreExtra = 0;
              for (const palabra of palabrasClave) {
                const esMarcaImportante = ['mobil', 'shell', 'delo', 'rotella', 'chevron', 'valvoline'].includes(palabra);
                const esGradoViscosidad = /^\d+w\d+$/.test(palabra) || palabra === 'sae';
                // NUEVO: Dar peso extra si el producto contiene 'synthetic', 'hdmo' o 'bulk'
                const esPalabraClaveEspecial = ['synthetic', 'hdmo', 'bulk'].includes(palabra);
                if (esMarcaImportante || esGradoViscosidad) {
                  if (normalizar(p.memo).includes(palabra) || 
                      normalizar(p.otra || '').includes(palabra) || 
                      normalizar(p.full || '').includes(palabra)) {
                    scoreExtra += 0.2;
                  }
                }
                // NUEVO: Peso extra para palabras clave especiales
                if (esPalabraClaveEspecial) {
                  if (normalizar(p.memo).includes(palabra) || 
                      normalizar(p.otra || '').includes(palabra) || 
                      normalizar(p.full || '').includes(palabra)) {
                    scoreExtra += 0.3; // Más peso para asegurar que suba en el ranking
                  }
                }
              }
              return { ...p, score: scoreTexto + scoreExtra };
            }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

            // Umbral adaptativo basado en la longitud del texto
            const minScore = nombreProducto.length <= 3 ? 0.3 : 0.05;
            const resultadosFiltrados = encontrados.filter(r => r.score >= minScore).slice(0, 10);

            if (resultadosFiltrados.length > 0) {
              // Siempre mostrar opciones al usuario para este producto
              estado.paso = 'esperandoSeleccionRapido';
              estado.opciones = resultadosFiltrados;
              estado.productoTemporalCantidad = cantidad;
              estado.productoTemporalNombre = nombreProducto;
              const opciones = resultadosFiltrados.map((p, i) => `${i + 1}. ${p.memo}`).join('\n');
              await bot.sendMessage(chatId, `🔍 Opciones encontradas para "${nombreProducto}":\n${opciones}\n\nSelecciona el número del producto correcto o escribe una nueva búsqueda.`);
              return;
            } else {
              productosNoEncontrados.push(nombreProducto);
              productos.push(nombreProducto); // Mantener el nombre original
              cantidades.push(cantidad);
              codigos.push('');
            }
          } else if (i === lineas.length - 1) {
            direccionManual = linea;
          }
        }

        if (productos.length === 0) {
          return bot.sendMessage(chatId, '❌ No se encontraron productos válidos en el formato correcto.');
        }

        // Si hay productos no encontrados en el catálogo, mostrar advertencia
        let mensajeAdvertencia = '';
        if (productosNoEncontrados.length > 0) {
          mensajeAdvertencia = '\n\n⚠️ Los siguientes productos no se encontraron exactamente en el catálogo:\n' +
            productosNoEncontrados.map(p => `• ${p}`).join('\n') +
            '\nSe guardaron con el nombre proporcionado.';
        }

        // Guardar temporalmente en el estado
        estado.pedidoTemporal = {
          nombre,
          productos,
          cantidades,
          codigos,
          fecha: moment().format('MM/DD/YYYY'),
          usuario,
          direccionManual
        };

        // Mostrar resumen y opciones
        const resumen = productos.map((p, i) => `• ${p} (${cantidades[i]})`).join('\n');
        const direccionFinal = direccionManual || buscarDireccion(nombre);
        
        await bot.sendMessage(chatId, 
          `📄 *Resumen del pedido:*\n\n` +
          `📦 *Cliente: ${nombre}*\n\n` +
          `${resumen}\n\n` +
          `📍 Dirección: ${direccionFinal}` +
          mensajeAdvertencia +
          `\n\n¿Deseas?\n` +
          `0️⃣ Cancelar pedido\n` +
          `1️⃣ Añadir otro producto\n` +
          `2️⃣ Eliminar un producto\n` +
          `3️⃣ Finalizar pedido\n` +
          `4️⃣ Modificar dirección`,
          { parse_mode: 'Markdown' }
        );
        
        estado.paso = 'confirmarPedidoRapido';
      } catch (error) {
        console.error('Error en pedido rápido:', error);
        bot.sendMessage(chatId, '❌ Ocurrió un error al procesar el pedido. Por favor, verifica el formato e intenta nuevamente.');
      }
      break;

    case 'confirmarPedidoRapido':
      if (texto === '0') {
        delete estados[chatId];
        bot.sendMessage(chatId, '❌ Pedido cancelado. Puedes iniciar uno nuevo cuando quieras.');
      } else if (texto === '1') {
        estado.paso = 'agregarProductoRapido';
        bot.sendMessage(chatId, '📦 Escribe el nombre del nuevo producto:');
      } else if (texto === '2') {
        const lista = estado.pedidoTemporal.productos.map((p, i) => `${i + 1}. ${p} (${estado.pedidoTemporal.cantidades[i]})`).join('\n');
        estado.paso = 'eliminarProductoRapido';
        bot.sendMessage(chatId, `🗑 ¿Cuál producto deseas eliminar?\n${lista}`);
      } else if (texto === '3') {
        // Guardar el pedido final
        await guardarEnSheets(estado.pedidoTemporal);
        bot.sendMessage(chatId, '✅ Pedido guardado exitosamente. Puedes iniciar otro pedido enviando un nuevo mensaje.');
        delete estados[chatId];
      } else if (texto === '4') {
        estado.paso = 'modificarDireccionRapida';
        bot.sendMessage(chatId, '📍 Escribe la nueva dirección:');
      }
      break;

    case 'esperandoSeleccionRapido':
      const indiceRapidoSel = parseInt(texto);
      if (!isNaN(indiceRapidoSel) && estado.opciones[indiceRapidoSel - 1]) {
        const seleccionado = estado.opciones[indiceRapidoSel - 1];
        if (!estado.pedidoTemporal) {
          estado.pedidoTemporal = { productos: [], cantidades: [], codigos: [] };
        }
        estado.pedidoTemporal.productos.push(seleccionado.memo);
        estado.pedidoTemporal.cantidades.push(estado.productoTemporalCantidad || '1');
        estado.pedidoTemporal.codigos.push(seleccionado.codigo);
        // Limpiar opciones temporales
        delete estado.opciones;
        delete estado.productoTemporalCantidad;
        delete estado.productoTemporalNombre;
        // Mostrar resumen actualizado
        const resumenActualizado = estado.pedidoTemporal.productos.map((p, i) => 
          `• ${p} (${estado.pedidoTemporal.cantidades[i]})`
        ).join('\n');
        estado.paso = 'confirmarPedidoRapido';
        bot.sendMessage(chatId,
          `📄 *Pedido actualizado:*\n\n` +
          `${resumenActualizado}\n\n` +
          `¿Deseas?\n` +
          `0️⃣ Cancelar pedido\n` +
          `1️⃣ Añadir otro producto\n` +
          `2️⃣ Eliminar un producto\n` +
          `3️⃣ Finalizar pedido\n` +
          `4️⃣ Modificar dirección`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Permitir nueva búsqueda si el usuario escribe texto
        estado.paso = 'agregarProductoRapido';
        bot.sendMessage(chatId, '🔍 Escribe el nombre del producto otra vez:');
      }
      break;

    case 'agregarProductoRapido':
      try {
        const encontrados = productosData.map(p => {
          const scoreTexto = Math.max(
            obtenerSimilitud(texto, p.memo),
            obtenerSimilitud(texto, p.otra || ''),
            obtenerSimilitud(texto, p.full || '')
          );
          const textoNormalizado = normalizar(texto);
          const palabrasClave = textoNormalizado.split(' ').filter(w => w.length > 2);
          let scoreExtra = 0;
          for (const palabra of palabrasClave) {
            const esMarcaImportante = ['mobil', 'shell', 'delo', 'rotella', 'chevron', 'valvoline'].includes(palabra);
            const esGradoViscosidad = /^\d+w\d+$/.test(palabra) || palabra === 'sae';
            if (esMarcaImportante || esGradoViscosidad) {
              if (normalizar(p.memo).includes(palabra) || 
                  normalizar(p.otra || '').includes(palabra) || 
                  normalizar(p.full || '').includes(palabra)) {
                scoreExtra += 0.2;
              }
            }
          }
          return { ...p, score: scoreTexto + scoreExtra };
        }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);
        const minScore = texto.length <= 3 ? 0.3 : 0.05;
        const resultadosFiltrados = encontrados.filter(r => r.score >= minScore).slice(0, 10);
        if (resultadosFiltrados.length > 0) {
          estado.opciones = resultadosFiltrados;
          estado.paso = 'esperandoSeleccion';
          const opciones = resultadosFiltrados.map((p, i) => `${i + 1}. ${p.memo}`).join('\n');
          await bot.sendMessage(chatId, 
            `🔍 Opciones encontradas:\n${opciones}\n\nSelecciona el número del producto correcto o escribe una nueva búsqueda.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          estado.paso = 'productoSinCoincidencia';
          estado.entradaManual = texto;
          bot.sendMessage(chatId, '❌ No se encontró ninguna coincidencia.\n¿Qué deseas hacer?\n1️⃣ Buscar otra vez\n2️⃣ Escribir producto manual');
        }
      } catch (error) {
        console.error('Error al agregar producto:', error);
        bot.sendMessage(chatId, '❌ Error al procesar el producto. Intenta nuevamente.');
      }
      break;

    case 'cantidadProductoRapido':
      if (!/^\d+$/.test(texto)) {
        return bot.sendMessage(chatId, '❌ Por favor ingresa una cantidad válida (solo números).');
      }

      estado.pedidoTemporal.productos.push(estado.productoTemporal.memo);
      estado.pedidoTemporal.cantidades.push(texto);
      estado.pedidoTemporal.codigos.push(estado.productoTemporal.codigo || '');

      // Mostrar resumen actualizado
      const resumenActualizado = estado.pedidoTemporal.productos.map((p, i) => 
        `• ${p} (${estado.pedidoTemporal.cantidades[i]})`
      ).join('\n');
      
      estado.paso = 'confirmarPedidoRapido';
      bot.sendMessage(chatId,
        `📄 *Pedido actualizado:*\n\n` +
        `${resumenActualizado}\n\n` +
        `¿Deseas?\n` +
        `0️⃣ Cancelar pedido\n` +
        `1️⃣ Añadir otro producto\n` +
        `2️⃣ Eliminar un producto\n` +
        `3️⃣ Finalizar pedido\n` +
        `4️⃣ Modificar dirección`,
        { parse_mode: 'Markdown' }
      );
      break;

    case 'eliminarProductoRapido':
      const indiceRapido = parseInt(texto) - 1;
      const resultadoRapido = eliminarProducto(
        indiceRapido,
        estado.pedidoTemporal.productos,
        estado.pedidoTemporal.cantidades,
        estado.pedidoTemporal.codigos
      );
      
      if (resultadoRapido.error) {
        return bot.sendMessage(chatId, resultadoRapido.error);
      }

      // Mostrar resumen actualizado
      const resumenDespuesEliminar = estado.pedidoTemporal.productos.map((p, i) => 
        `• ${p} (${estado.pedidoTemporal.cantidades[i]})`
      ).join('\n');

      estado.paso = 'confirmarPedidoRapido';
      bot.sendMessage(chatId,
        `📄 *Pedido actualizado:*\n\n` +
        `${resumenDespuesEliminar}\n\n` +
        `¿Deseas?\n` +
        `0️⃣ Cancelar pedido\n` +
        `1️⃣ Añadir otro producto\n` +
        `2️⃣ Eliminar un producto\n` +
        `3️⃣ Finalizar pedido\n` +
        `4️⃣ Modificar dirección`,
        { parse_mode: 'Markdown' }
      );
      break;

    case 'modificarDireccionRapida':
      estado.pedidoTemporal.direccionManual = texto;
      
      // Mostrar resumen actualizado con la nueva dirección
      const resumenConDireccion = estado.pedidoTemporal.productos.map((p, i) => 
        `• ${p} (${estado.pedidoTemporal.cantidades[i]})`
      ).join('\n');

      estado.paso = 'confirmarPedidoRapido';
      bot.sendMessage(chatId,
        `📄 *Pedido actualizado:*\n\n` +
        `${resumenConDireccion}\n\n` +
        `📍 Nueva dirección: ${texto}\n\n` +
        `¿Deseas?\n` +
        `0️⃣ Cancelar pedido\n` +
        `1️⃣ Añadir otro producto\n` +
        `2️⃣ Eliminar un producto\n` +
        `3️⃣ Finalizar pedido\n` +
        `4️⃣ Modificar dirección`,
        { parse_mode: 'Markdown' }
      );
      break;

    case 'seleccionarPedido': {
      const index = parseInt(texto) - 1;
      if (isNaN(index) || !estado.pedidos[index]) {
        return bot.sendMessage(chatId, '❌ Selección inválida');
      }
      
      const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
      await doc.useServiceAccountAuth(GOOGLE_CREDENTIALS);
      await doc.loadInfo();
      const sheetPedidos = doc.sheetsByTitle['Pedidos'];
      const rows = await sheetPedidos.getRows();
      
      if (index >= rows.length) {
        return bot.sendMessage(chatId, '❌ El pedido ya no existe');
      }
      
      const pedido = estado.pedidos[index];
      const row = rows[pedido.rowIndex]; // Usar rowIndex del pedido
      
      // Construir resumen del pedido
      const resumen = `
    📄 *Pedido seleccionado:*
    
    *Cliente:* ${pedido.nombre}
    *Fecha:* ${row['Fecha de Despacho']}
    *Productos:*
    ${row['Productos'].split('\n').map((p, i) => `• ${p} (${row['Cantidad'].split('\n')[i]})`).join('\n')}
    
    📍 *Dirección:* ${buscarDireccion(pedido.nombre)}
      `;
      
      estado.pedidoSeleccionado = {
        ...pedido,
        productos: row['Productos'].split('\n'),
        cantidades: row['Cantidad'].split('\n'),
        rowIndex: pedido.rowIndex
      };
      
      await bot.sendMessage(chatId, resumen, { parse_mode: 'Markdown' });
      estado.paso = 'opcionesModificacion';
      bot.sendMessage(chatId,
        '¿Qué deseas modificar?\n' +
        '1️⃣ Modificar productos\n' +
        '2️⃣ Modificar fecha\n' +
        '3️⃣ Modificar dirección\n' +
        '4️⃣ Eliminar pedido'
      );
      break;
    }

    case 'opcionesModificacion':
      if (texto === '1') {
        estado.paso = 'modificarProductos';
        bot.sendMessage(chatId, 
          '¿Qué operación deseas realizar?\n' +
          '1️⃣ Agregar producto\n' +
          '2️⃣ Modificar cantidad\n' +
          '3️⃣ Eliminar producto'
        );
      } else if (texto === '2') {
        estado.paso = 'modificarFecha';
        bot.sendMessage(chatId, '🗓 Ingresa la nueva fecha de despacho (MM/DD):');
      } else if (texto === '3') {
        estado.paso = 'modificarDireccion';
        bot.sendMessage(chatId, '📍 Ingresa la nueva dirección:');
      } else if (texto === '4') {
        await eliminarPedido(estado.pedidoSeleccionado.rowIndex);
        delete estados[chatId];
        bot.sendMessage(chatId, '✅ Pedido eliminado correctamente');
      }
      break;

    case 'modificarProductos': {
      if (texto === '1') {
        estado.paso = 'agregarProducto';
        bot.sendMessage(chatId, '📦 Escribe el nombre del nuevo producto:');
      } else if (texto === '2') {
        const lista = estado.pedidoSeleccionado.productos.map((p, i) => `${i + 1}. ${p} (${estado.pedidoSeleccionado.cantidades[i]})`).join('\n');
        estado.paso = 'seleccionarProductoModificar';
        bot.sendMessage(chatId, `Selecciona el producto a modificar:\n${lista}`);
      } else if (texto === '3') {
        const lista = estado.pedidoSeleccionado.productos.map((p, i) => `${i + 1}. ${p}`).join('\n');
        estado.paso = 'seleccionarProductoEliminar';
        bot.sendMessage(chatId, `Selecciona el producto a eliminar:\n${lista}`);
      }
      break;
    }

    case 'agregarProducto': {
      const encontrados = productosData.map(p => {
        const scoreTexto = Math.max(
          obtenerSimilitud(texto, p.memo),
          obtenerSimilitud(texto, p.otra || ''),
          obtenerSimilitud(texto, p.full || '')
        );
        
        // Revisar si hay palabras claves exactas (como marcas o tipos)
        const textoNormalizado = normalizar(texto);
        const palabrasClave = textoNormalizado.split(' ').filter(w => w.length > 2);
        
        // Dar puntaje extra si contiene palabras clave importantes
        let scoreExtra = 0;
        for (const palabra of palabrasClave) {
          const esMarcaImportante = ['mobil', 'shell', 'delo', 'rotella', 'chevron', 'valvoline'].includes(palabra);
          const esGradoViscosidad = /^\d+w\d+$/.test(palabra) || palabra === 'sae';
          
          if (esMarcaImportante || esGradoViscosidad) {
            // Verificar si la palabra clave está en alguna descripción
            if (normalizar(p.memo).includes(palabra) || 
                normalizar(p.otra || '').includes(palabra) || 
                normalizar(p.full || '').includes(palabra)) {
              scoreExtra += 0.2;
            }
          }
        }
        
        // Combinar scores
        return { ...p, score: scoreTexto + scoreExtra };
      }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

      // Aplicar filtrado inteligente con umbral adaptativo
      const minScore = texto.length <= 3 ? 0.3 : 0.05; // Umbral más estricto para búsquedas muy cortas
      const resultadosFiltrados = encontrados.filter(r => r.score >= minScore).slice(0, 10);

      if (resultadosFiltrados.length > 1) {
        estado.opciones = resultadosFiltrados;
        estado.paso = 'esperandoSeleccion';
        const opciones = resultadosFiltrados.map((p, i) => `${i + 1}. ${p.memo}`).join('\n');
        
        await enviarMensajeLargo(chatId, 
          `🔍 Resultados más relevantes:\n\n${opciones}\n\n` +
          `🔍 Selecciona un producto escribiendo su número o escribe una nueva búsqueda si no encuentras lo que buscas.`,
          { parse_mode: 'Markdown' }
        );
      } else if (resultadosFiltrados.length === 1) {
        estado.productos.push(resultadosFiltrados[0].memo);
        estado.codigos.push(resultadosFiltrados[0].codigo);
        estado.paso = 'cantidad';
        bot.sendMessage(chatId, `📦 Escribe la cantidad para *${resultadosFiltrados[0].memo}*:`, { parse_mode: 'Markdown' });
      } else {
        estado.paso = 'productoSinCoincidencia';
        estado.entradaManual = texto;
        bot.sendMessage(chatId, '❌ No se encontró ninguna coincidencia.\n¿Qué deseas hacer?\n1️⃣ Buscar otra vez\n2️⃣ Escribir producto manual');
      }
      break;
    }

    case 'esperandoSeleccion':
      const indice = parseInt(texto);
      if (!isNaN(indice) && estado.opciones[indice - 1]) {
        const seleccionado = estado.opciones[indice - 1];
        estado.productos.push(seleccionado.memo);
        estado.codigos.push(seleccionado.codigo);
        estado.paso = 'cantidad';
        bot.sendMessage(chatId, `📦 Escribe la cantidad para *${seleccionado.memo}*:`, { parse_mode: 'Markdown' });
      }
      break;

    case 'productoSinCoincidencia':
      if (texto === '1') {
        estado.paso = 'producto';
        bot.sendMessage(chatId, '📦 Escribe el nombre del producto otra vez:');
      } else if (texto === '2') {
        estado.productos.push(estado.entradaManual);
        estado.codigos.push('');
        estado.paso = 'cantidad';
        bot.sendMessage(chatId, `📦 Escribe la cantidad para *${estado.entradaManual}*:`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, '❌ Opción inválida. Usa 1 o 2.');
      }
      break;

    case 'cantidad':
      if (!/^[0-9]+$/.test(texto)) {
        return bot.sendMessage(chatId, '❌ Por favor ingresa una cantidad válida.');
      }
      estado.cantidades.push(texto);
      estado.paso = 'agregarOtro';
      bot.sendMessage(chatId, '¿Qué deseas hacer ahora?\n1️⃣ Añadir otro producto\n2️⃣ Finalizar productos\n3️⃣ Eliminar producto');
      break;

    case 'agregarOtro':
      if (texto === '1') {
        estado.paso = 'producto';
        bot.sendMessage(chatId, '📦 Escribe el nombre del próximo producto:');
      } else if (texto === '2') {
        if (estado.productos.length === 0) {
          estado.paso = 'producto';
          bot.sendMessage(chatId, '⚠️ No hay productos en el pedido. Añade al menos uno.');
        } else {
          estado.paso = 'fecha';
          bot.sendMessage(chatId, '🗓 ¿Cuál es la fecha de despacho? (MM/DD)');
        }
      } else if (texto === '3') {
        const resumen = estado.productos.map((p, i) => `${i + 1}. ${p} (${estado.cantidades[i]})`).join('\n');
        estado.paso = 'eliminarResumen';
        bot.sendMessage(chatId, `🗑 ¿Cuál producto deseas eliminar?\n${resumen}`);
      } else {
        bot.sendMessage(chatId, '❌ Opción inválida. Usa 1, 2 o 3.');
      }
      break;

    case 'eliminarResumen':
      indiceAEliminar = parseInt(texto) - 1;
      resultadoEliminar = eliminarProducto(indiceAEliminar, estado.productos, estado.cantidades, estado.codigos);
      if (resultadoEliminar.error) {
        return bot.sendMessage(chatId, resultadoEliminar.error);
      }
      bot.sendMessage(chatId, `🗑 Producto eliminado: ${resultadoEliminar.eliminado}`);
      estado.paso = 'agregarOtro';
      bot.sendMessage(chatId, '¿Deseas añadir otro producto?\n1️⃣ Sí\n2️⃣ Terminar pedido');
      break;

    case 'fecha':
      resultadoFecha = procesarFecha(texto);
      if (resultadoFecha.error) {
        return bot.sendMessage(chatId, resultadoFecha.error);
      }
      estado.fecha = resultadoFecha.fecha;
      estado.paso = 'notaPregunta';
      bot.sendMessage(chatId, '🗒 ¿Quieres hacer una nota?\n1️⃣ Sí\n2️⃣ No');
      break;

    case 'notaPregunta':
      if (texto === '1') {
        estado.paso = 'nota';
        bot.sendMessage(chatId, '✍️ Escribe tu nota:');
      } else if (texto === '2') {
        estado.nota = '';
        estado.paso = 'resumen';
        mostrarResumen(chatId);
      } else {
        bot.sendMessage(chatId, '❌ Opción inválida. Usa 1 o 2.');
      }
      break;

    case 'nota':
      estado.nota = texto;
      estado.paso = 'resumen';
      mostrarResumen(chatId);
      break;

    case 'resumen':
      if (texto === '1') {
        estado.paso = 'producto';
        bot.sendMessage(chatId, '📦 Escribe el nombre del nuevo producto:');
      } else if (texto === '2') {
        const resumen = estado.productos.map((p, i) => `${i + 1}. ${p} (${estado.cantidades[i]})`).join('\n');
        estado.paso = 'eliminarResumen';
        bot.sendMessage(chatId, `🗑 ¿Cuál producto deseas eliminar?\n${resumen}`);
      } else if (texto === '3') {
        const usuario = msg.from.username || msg.from.first_name || 'Desconocido';
        estado.usuario = usuario;
        await guardarEnSheets(estado);
        delete estados[chatId];
        bot.sendMessage(chatId, '✅ Pedido guardado con éxito. Puedes iniciar otro pedido enviando un nuevo mensaje.');
      } else if (texto === '0') {
        delete estados[chatId];
        bot.sendMessage(chatId, '❌ Pedido cancelado. Puedes iniciar uno nuevo cuando quieras.');
      } else if (texto.toLowerCase() === 'direccion' || texto === '4') {
        estado.paso = 'direccionManual';
        bot.sendMessage(chatId, '📍 Escribe la dirección manual para este pedido:');
      } else {
        bot.sendMessage(chatId, '❌ Número inválido.');
      }
      break;

    case 'direccionManual':
      estado.direccionManual = texto;
      estado.paso = 'resumen';
      mostrarResumen(chatId);
      break;

    case 'seleccionarProductoModificar': {
      const index = parseInt(texto) - 1;
      if (isNaN(index) || !estado.pedidoSeleccionado.productos[index]) {
        return bot.sendMessage(chatId, '❌ Selección inválida');
      }
      estado.productoIndex = index;
      estado.paso = 'nuevaCantidad';
      bot.sendMessage(chatId, 'Ingresa la nueva cantidad:');
      break;
    }

    case 'nuevaCantidad': {
      if (!/^\d+$/.test(texto)) {
        return bot.sendMessage(chatId, '❌ Cantidad inválida');
      }
    
      // Asegurar que rowIndex existe
      if (typeof estado.pedidoSeleccionado.rowIndex === 'undefined') {
        throw new Error('rowIndex no definido en pedidoSeleccionado');
      }
    
      // Actualizar datos locales
      estado.pedidoSeleccionado.cantidades[estado.productoIndex] = texto;
    
      // Usar la función helper
      const pedidoActualizado = crearObjetoPedido(estado.pedidoSeleccionado);
    
      // Verificar datos antes de enviar
      console.log('Datos enviados a actualizar:', pedidoActualizado);
    
      await actualizarProductosEnPedido(pedidoActualizado);
      
      // Restablecer estado para futuras modificaciones
      estado.pedidoSeleccionado.rowIndex = -1;
      
      bot.sendMessage(chatId, '✅ Cambios guardados exitosamente\n1️⃣ Seguir editando\n2️⃣ Terminar');
      estado.paso = 'continuarEdicion';
      break;
    }

    case 'seleccionarProductoEliminar': {
      const index = parseInt(texto) - 1;
      if (isNaN(index) || !estado.pedidoSeleccionado.productos[index]) {
        return bot.sendMessage(chatId, '❌ Selección inválida');
      }
      
      const nuevosProductos = estado.pedidoSeleccionado.productos.filter((_, i) => i !== index);
      const nuevasCantidades = estado.pedidoSeleccionado.cantidades.filter((_, i) => i !== index);
      
      estado.pedidoSeleccionado.productos = nuevosProductos;
      estado.pedidoSeleccionado.cantidades = nuevasCantidades;
      
      await actualizarProductosEnPedido(crearObjetoPedido(estado.pedidoSeleccionado));
      
      estado.paso = 'continuarEdicion';
      bot.sendMessage(chatId, '✅ Producto eliminado\n1️⃣ Seguir editando\n2️⃣ Terminar');
      break;
    }

    case 'modificarFecha': {
      const [mes, dia] = texto.split('/');
      if (!mes || !dia || isNaN(mes) || isNaN(dia)) {
        return bot.sendMessage(chatId, '❌ Formato inválido. Usa MM/DD');
      }

      try {
        const nuevaFecha = `${mes.padStart(2, '0')}/${dia.padStart(2, '0')}/${new Date().getFullYear()}`;
        
        // Actualizar el pedido con la nueva fecha
        await actualizarProductosEnPedido(crearObjetoPedido(estado.pedidoSeleccionado, { fecha: nuevaFecha }));
        
        // Actualizar el estado después de guardar exitosamente
        estado.pedidoSeleccionado.fecha = nuevaFecha;
        estado.paso = 'continuarEdicion';
        bot.sendMessage(chatId, `✅ Fecha actualizada\n1️⃣ Seguir editando\n2️⃣ Terminar`);
      } catch (error) {
        console.error('Error al actualizar fecha:', error);
        bot.sendMessage(chatId, '❌ Error al actualizar la fecha');
      }
      break;
    }

    case 'modificarDireccion': {
      try {
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth(GOOGLE_CREDENTIALS);
        await doc.loadInfo();
        
        // Primero eliminamos el pedido anterior en ambas hojas
        const sheetPedidos = doc.sheetsByTitle['Pedidos'];
        const hojaCircuit = doc.sheetsByTitle['Circuit'];
        
        const rowsPedidos = await sheetPedidos.getRows();
        const rowsCircuit = await hojaCircuit.getRows();
        
        // Eliminar de la hoja principal
        if (estado.pedidoSeleccionado.rowIndex >= 0 && estado.pedidoSeleccionado.rowIndex < rowsPedidos.length) {
          await rowsPedidos[estado.pedidoSeleccionado.rowIndex].delete();
        }
        
        // Eliminar de Circuit
        const circuitIndex = rowsCircuit.findIndex(r => 
          r['Address/Company Name'] === estado.pedidoSeleccionado.nombre
        );
        if (circuitIndex >= 0) {
          await rowsCircuit[circuitIndex].delete();
        }
        
        // Crear nuevas filas con la información actualizada
        await sheetPedidos.addRow({
          'Nombre del Cliente': estado.pedidoSeleccionado.nombre,
          'Productos': estado.pedidoSeleccionado.productos.join('\n'),
          'Cantidad': estado.pedidoSeleccionado.cantidades.join('\n'),
          'Fecha de Despacho': estado.pedidoSeleccionado.fecha,
          'Notas': estado.pedidoSeleccionado.nota || '',
          'Usuario': estado.pedidoSeleccionado.usuario,
          'codigo': (estado.pedidoSeleccionado.codigos || []).join('\n')
        });
        
        await hojaCircuit.addRow({
          'Address/Company Name': estado.pedidoSeleccionado.nombre,
          'Address line 1': texto,
          'Internal notes': estado.pedidoSeleccionado.productos.map((p, i) => 
            `${p} (${estado.pedidoSeleccionado.cantidades[i]})`
          ).join(', '),
          'seller': estado.pedidoSeleccionado.usuario,
          'Driver (email or phone number)': ''
        });
        
        estado.paso = 'continuarEdicion';
        bot.sendMessage(chatId, '✅ Dirección actualizada\n1️⃣ Seguir editando\n2️⃣ Terminar');
      } catch (error) {
        console.error('Error al actualizar dirección:', error);
        bot.sendMessage(chatId, '❌ Error al actualizar la dirección');
      }
      break;
    }

    case 'continuarEdicion':
      if (texto === '1') {
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth(GOOGLE_CREDENTIALS);
        await doc.loadInfo();
        const sheetPedidos = doc.sheetsByTitle['Pedidos'];
        
        // Recargar filas actualizadas
        const rows = await sheetPedidos.getRows();
        
        // Buscar el pedido actualizado por nombre y fecha
        const pedidoActualizado = rows.find(row => 
          row['Nombre del Cliente'] === estado.pedidoSeleccionado.nombre &&
          row['Fecha de Despacho'] === estado.pedidoSeleccionado.fecha
        );
        
        if (!pedidoActualizado) {
          return bot.sendMessage(chatId, '❌ No se pudo encontrar el pedido actualizado');
        }
        
        // Actualizar el índice con la posición real
        estado.pedidoSeleccionado.rowIndex = rows.indexOf(pedidoActualizado);
        
        // Actualizar datos locales
        estado.pedidoSeleccionado.productos = pedidoActualizado['Productos'].split('\n');
        estado.pedidoSeleccionado.cantidades = pedidoActualizado['Cantidad'].split('\n');
        
        // Mostrar menú de modificación
        estado.paso = 'opcionesModificacion';
        bot.sendMessage(chatId,
          '¿Qué deseas modificar?\n' +
          '1️⃣ Modificar productos\n' +
          '2️⃣ Modificar fecha\n' +
          '3️⃣ Modificar dirección\n' +
          '4️⃣ Eliminar pedido'
        );
      } else if (texto === '2') {
        delete estados[chatId];
        bot.sendMessage(chatId, '✅ Modificaciones finalizadas');
      }
      break;

    case 'nombre':
      estado.nombre = texto;
      estado.paso = 'producto';
      bot.sendMessage(chatId, '📦 Escribe el nombre del producto:');
      break;

    case 'producto':
      const resultados = buscarProductos(texto);
      console.log(`Resultados encontrados para "${texto}":`, resultados.length);
      
      if (resultados.length > 0) {
        estado.opciones = resultados;
        estado.paso = 'esperandoSeleccion';
        const opciones = resultados.map((p, i) => `${i + 1}. ${p.memo}`).join('\n');
        await enviarMensajeLargo(chatId, 
          `🔍 Opciones encontradas:\n${opciones}\n\nSelecciona un producto escribiendo su número o escribe una nueva búsqueda si no encuentras lo que buscas.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        estado.paso = 'productoSinCoincidencia';
        estado.entradaManual = texto;
        bot.sendMessage(chatId, '❌ No se encontró ninguna coincidencia.\n¿Qué deseas hacer?\n1️⃣ Buscar otra vez\n2️⃣ Escribir producto manual');
      }
      break;

    case 'productoSinCoincidencia':
      if (texto === '1') {
        estado.paso = 'producto';
        bot.sendMessage(chatId, '📦 Escribe el nombre del producto otra vez:');
      } else if (texto === '2') {
        estado.productos.push(estado.entradaManual);
        estado.codigos.push('');
        estado.paso = 'cantidad';
        bot.sendMessage(chatId, `📦 Escribe la cantidad para *${estado.entradaManual}*:`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, '❌ Opción inválida. Usa 1 o 2.');
      }
      break;

    case 'cantidad':
      if (!/^[0-9]+$/.test(texto)) {
        return bot.sendMessage(chatId, '❌ Por favor ingresa una cantidad válida.');
      }
      estado.cantidades.push(texto);
      estado.paso = 'agregarOtro';
      bot.sendMessage(chatId, '¿Qué deseas hacer ahora?\n1️⃣ Añadir otro producto\n2️⃣ Finalizar productos\n3️⃣ Eliminar producto');
      break;

    case 'agregarOtro':
      if (texto === '1') {
        estado.paso = 'producto';
        bot.sendMessage(chatId, '📦 Escribe el nombre del próximo producto:');
      } else if (texto === '2') {
        if (estado.productos.length === 0) {
          estado.paso = 'producto';
          bot.sendMessage(chatId, '⚠️ No hay productos en el pedido. Añade al menos uno.');
        } else {
          estado.paso = 'fecha';
          bot.sendMessage(chatId, '🗓 ¿Cuál es la fecha de despacho? (MM/DD)');
        }
      } else if (texto === '3') {
        const resumen = estado.productos.map((p, i) => `${i + 1}. ${p} (${estado.cantidades[i]})`).join('\n');
        estado.paso = 'eliminarResumen';
        bot.sendMessage(chatId, `🗑 ¿Cuál producto deseas eliminar?\n${resumen}`);
      } else {
        bot.sendMessage(chatId, '❌ Opción inválida. Usa 1, 2 o 3.');
      }
      break;

    case 'cantidadModificar': {
      if (!/^\d+$/.test(texto)) {
        return bot.sendMessage(chatId, '❌ Cantidad inválida');
      }
      
      // Actualizar arrays
      const nuevosProductos = [...estado.pedidoSeleccionado.productos, estado.productoTemporal.nombre];
      const nuevasCantidades = [...estado.pedidoSeleccionado.cantidades, texto];
      
      await actualizarProductosEnPedido({
        rowIndex: estado.pedidoSeleccionado.rowIndex,
        nombre: estado.pedidoSeleccionado.nombre,
        productos: nuevosProductos,
        cantidades: nuevasCantidades,
        fecha: estado.pedidoSeleccionado.fecha,
        nota: estado.pedidoSeleccionado.nota || '',
        usuario: estado.pedidoSeleccionado.usuario,
        codigos: estado.pedidoSeleccionado.codigos || []
      });
      
      // Actualizar estado local
      estado.pedidoSeleccionado.productos = nuevosProductos;
      estado.pedidoSeleccionado.cantidades = nuevasCantidades;
      
      estado.paso = 'continuarEdicion';
      bot.sendMessage(chatId, '✅ Producto agregado\n1️⃣ Seguir editando\n2️⃣ Terminar');
      break;
    }
  }
});

function mostrarResumen(chatId) {
  const estado = estados[chatId];
  const resumen = estado.productos.map((p, i) => `• ${p} (${estado.cantidades[i]})`).join('\n');
  const direccion = estado.direccionManual || buscarDireccion(estado.nombre);
  enviarMensajeLargo(chatId, `📄 *Pedido para: ${estado.nombre}*\n\n${resumen}\n\n📍 Dirección: ${direccion}\n\n¿Deseas?\n0️⃣ Cancelar pedido\n1️⃣ Añadir otro producto\n2️⃣ Eliminar un producto\n3️⃣ Finalizar pedido\n4️⃣ Modificar dirección`, { parse_mode: 'Markdown' });
}

async function actualizarProductosEnPedido(data) {
  try {
    // Validación mejorada
    if (!data || typeof data.rowIndex === 'undefined' || !data.nombre || !data.productos || !data.cantidades) {
      console.error('Datos recibidos:', data);
      throw new Error('Faltan datos obligatorios para la actualización');
    }

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth(GOOGLE_CREDENTIALS);
    await doc.loadInfo();
    
    // Obtener ambas hojas
    const sheetPedidos = doc.sheetsByTitle['Pedidos'];
    const hojaCircuit = doc.sheetsByTitle['Circuit'];
    
    const rowsPedidos = await sheetPedidos.getRows();
    const rowsCircuit = await hojaCircuit.getRows();

    // Fecha actual para el registro
    const fechaSubida = moment().format('MM/DD/YYYY HH:mm:ss');

    // 1. Eliminar filas originales
    if (data.rowIndex >= 0 && data.rowIndex < rowsPedidos.length) {
      await rowsPedidos[data.rowIndex].delete();
    }
    
    // Buscar y eliminar en Circuit
    const circuitIndex = rowsCircuit.findIndex(r => 
      r['Address/Company Name'] === data.nombre
    );
    if (circuitIndex >= 0) {
      await rowsCircuit[circuitIndex].delete();
    }

    // 2. Crear nuevas filas con los datos actualizados
    await sheetPedidos.addRow({
      'Nombre del Cliente': data.nombre,
      'Productos': data.productos.join('\n'),
      'Cantidad': data.cantidades.join('\n'),
      'Fecha de Despacho': data.fecha || moment().format('MM/DD/YYYY'),
      'Notas': data.nota || '',
      'Usuario': data.usuario || 'Desconocido',
      'codigo': (data.codigos || Array(data.productos.length).fill('')).join('\n')
    });

    // 3. Actualizar Circuit con nueva fila
    await hojaCircuit.addRow({
      'Address/Company Name': data.nombre,
      'Address line 1': buscarDireccion(data.nombre),
      'Internal notes': data.productos.map((p, i) => `${p} (${data.cantidades[i]})`).join(', '),
      'seller': data.usuario || 'Desconocido',
      'Driver (email or phone number)': ''
    });

    // 4. Actualizar la hoja del usuario si existe
    const usuario = data.usuario || 'Desconocido';
    let hojaUsuario;
    try {
      hojaUsuario = doc.sheetsByTitle[usuario];
    } catch (error) {
      // La hoja no existe
      hojaUsuario = null;
    }

    // Si no existe una hoja para el usuario, crearla con los encabezados
    if (!hojaUsuario) {
      hojaUsuario = await doc.addSheet({
        title: usuario,
        headerValues: [
          'Nombre del Cliente',
          'Productos',
          'Cantidad',
          'Fecha de Despacho',
          'codigo',
          'Notas',
          'Usuario',
          'Fecha de subida'
        ]
      });
    }

    // Agregar el pedido actualizado a la hoja del usuario
    await hojaUsuario.addRow({
      'Nombre del Cliente': data.nombre,
      'Productos': data.productos.join('\n'),
      'Cantidad': data.cantidades.join('\n'),
      'Fecha de Despacho': data.fecha || moment().format('MM/DD/YYYY'),
      'codigo': (data.codigos || Array(data.productos.length).fill('')).join('\n'),
      'Notas': data.nota || '',
      'Usuario': usuario,
      'Fecha de subida': fechaSubida
    });

    return true;
  } catch (error) {
    console.error('Error al actualizar productos:', error);
    throw error;
  }
}

cargarDatos();