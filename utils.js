function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/gi, '');
}

function obtenerSimilitud(str1, str2) {
  const s1 = normalizar(str1);
  const s2 = normalizar(str2);
  const interseccion = s1.split(' ').filter(p => s2.includes(p)).length;
  return interseccion / Math.max(s1.split(' ').length, 1);
}

function buscarDireccion(cliente, direccionesData) {
  const mejor = direccionesData.map(dir => {
    return {
      ...dir,
      score: obtenerSimilitud(cliente, dir.nombre)
    };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score);

  return mejor.length > 0 ? mejor[0].direccion : '';
}

module.exports = { normalizar, obtenerSimilitud, buscarDireccion };
