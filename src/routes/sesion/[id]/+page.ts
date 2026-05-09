// Esta ruta depende de datos cargados desde OPFS en el cliente. No tiene
// sentido prerenderizarla en build (Node no tiene acceso a la BD), y el
// crawler no puede descubrir IDs concretos desde la home (vacía en prerender).
export const prerender = false;
