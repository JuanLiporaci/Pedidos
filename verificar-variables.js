#!/usr/bin/env node

/**
 * Script para verificar que las variables de entorno estén configuradas correctamente
 * Útil para debug antes de desplegar a Railway
 */

console.log('🔍 Verificando variables de entorno...\n');

// Variables requeridas
const requiredVars = {
  'TELEGRAM_BOT_TOKEN': {
    required: true,
    description: 'Token del bot de Telegram',
    validator: (val) => {
      if (!val) return '❌ No configurado';
      if (val.length < 20) return '⚠️ Muy corto (debe tener al menos 20 caracteres)';
      if (!val.includes(':')) return '⚠️ Formato incorrecto (debe tener formato: 123456789:ABC...)';
      return '✅ Válido';
    }
  },
  'SPREADSHEET_ID': {
    required: false,
    description: 'ID de Google Sheet (opcional, tiene valor por defecto)',
    validator: (val) => {
      if (!val) return '⚠️ No configurado (se usará valor por defecto)';
      return '✅ Configurado';
    }
  },
  'GOOGLE_CREDENTIALS': {
    required: true,
    description: 'Credenciales de Google Cloud (JSON o Base64)',
    validator: (val) => {
      if (!val) return '❌ No configurado';
      try {
        // Intentar parsear como JSON
        JSON.parse(val);
        return '✅ JSON válido';
      } catch (e) {
        try {
          // Intentar decodificar como Base64
          const decoded = Buffer.from(val, 'base64').toString('utf8');
          JSON.parse(decoded);
          return '✅ Base64 válido';
        } catch (e2) {
          return '❌ No es JSON válido ni Base64';
        }
      }
    }
  }
};

// Verificar cada variable
let allValid = true;
let missingRequired = false;

console.log('Variables de entorno:\n');

for (const [varName, config] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  const status = config.validator(value);
  const required = config.required ? ' (REQUERIDA)' : ' (opcional)';
  
  console.log(`${varName}${required}:`);
  console.log(`  Descripción: ${config.description}`);
  console.log(`  Estado: ${status}`);
  
  if (value) {
    // Mostrar una versión parcial del valor para verificación
    if (varName === 'TELEGRAM_BOT_TOKEN') {
      const preview = value.substring(0, 10) + '...' + value.substring(value.length - 5);
      console.log(`  Valor: ${preview}`);
    } else if (varName === 'GOOGLE_CREDENTIALS') {
      console.log(`  Longitud: ${value.length} caracteres`);
    } else {
      console.log(`  Valor: ${value}`);
    }
  }
  console.log('');
  
  if (config.required && !value) {
    allValid = false;
    missingRequired = true;
  } else if (config.required && status.includes('❌')) {
    allValid = false;
  }
}

// Mostrar todas las variables de entorno relacionadas
console.log('\n📋 Variables de entorno relacionadas encontradas:');
const relatedVars = Object.keys(process.env)
  .filter(k => /TELEGRAM|GOOGLE|SHEET|SPREAD|BOT|TOKEN/i.test(k))
  .sort();

if (relatedVars.length > 0) {
  relatedVars.forEach(k => {
    const isRequired = requiredVars[k]?.required;
    const marker = isRequired ? '⭐' : '  ';
    console.log(`${marker} ${k}`);
  });
} else {
  console.log('  (ninguna encontrada)');
}

// Resumen
console.log('\n' + '='.repeat(50));
if (allValid && !missingRequired) {
  console.log('✅ Todas las variables requeridas están configuradas correctamente');
  console.log('🚀 Listo para desplegar a Railway');
} else {
  console.log('❌ Hay problemas con las variables de entorno');
  if (missingRequired) {
    console.log('\n⚠️ Variables requeridas faltantes:');
    Object.entries(requiredVars)
      .filter(([_, config]) => config.required && !process.env[_])
      .forEach(([name, _]) => console.log(`   - ${name}`));
  }
  console.log('\n💡 Solución:');
  console.log('   1. Crea un archivo .env en la raíz del proyecto');
  console.log('   2. Agrega las variables faltantes:');
  console.log('      TELEGRAM_BOT_TOKEN=tu_token_aqui');
  console.log('      GOOGLE_CREDENTIALS=tu_credenciales_aqui');
  console.log('   3. Para Railway, configura las variables en el dashboard');
}
console.log('='.repeat(50) + '\n');

// Exit code
process.exit(allValid && !missingRequired ? 0 : 1);
