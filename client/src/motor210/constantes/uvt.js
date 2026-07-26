// UVT por año gravable — confirmado contra el .xlsm de referencia
// (hoja DATOS BÁSICOS) y coincide con el valor oficial DIAN para AG2025.
// Ver docs/reglas-tributarias-AG2025.md §0.
export const UVT_POR_ANIO = {
  2022: 38004,
  2023: 42412,
  2024: 47065,
  2025: 49799,
};

export function uvt(anioGravable) {
  const valor = UVT_POR_ANIO[anioGravable];
  if (!valor) throw new Error(`No hay UVT registrada para el año gravable ${anioGravable}`);
  return valor;
}
