const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../credentials.json');

let productosData = [];
let direccionesData = [];

async function cargarDatos() {
  const doc = new GoogleSpreadsheet('1CNyD_seHZZyB-2NPusYEpNGF8m5LzUz87RHIYitfnAU');
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const catalogo = doc.sheetsByTitle['Catalogo'];
  const productos = await catalogo.getRows();
  productosData = productos.map(row => ({
    codigo: row['Product/Service'],
    memo: row['Memo/Description'],
    otra: row['otra descripcion'],
    full: row['Product/Service full name']
  })).filter(p => p.memo);

  const direccionesSheet = doc.sheetsByTitle['Direcciones'];
  const direcciones = await direccionesSheet.getRows();
  direccionesData = direcciones.map(row => ({
    nombre: row['Customer full name'],
    direccion: row['Bill address']
  })).filter(d => d.nombre && d.direccion);
}

// Exporta tanto la función cargarDatos como las variables productosData y direccionesData
module.exports = { cargarDatos, productosData, direccionesData };
