// Constantes del sistema

export const ROLES = {
  CAJERA: 'cajera',
  COCINA: 'cocina',
  REPARTIDOR: 'repartidor',
  ENCARGADO: 'encargado',
  ADMIN: 'admin',
} as const;

export const CANALES = {
  WHATSAPP: 'whatsapp',
  LLAMADA: 'llamada',
  MOSTRADOR: 'mostrador',
  UBER: 'uber',
  DIDI: 'didi',
  WEB: 'web',
} as const;

export const METODOS_PAGO = {
  EFECTIVO: 'efectivo',
  TARJETA: 'tarjeta',
  TRANSFERENCIA: 'transferencia',
  APP: 'app',
} as const;

export const ESTADOS_PEDIDO = {
  RECIBIDO: 'recibido',
  EN_PREPARACION: 'en_preparacion',
  LISTO: 'listo',
  EN_REPARTO: 'en_reparto',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
} as const;

export const ESTADOS_REPARTO = {
  PENDIENTE: 'pendiente',
  EN_CAMINO: 'en_camino',
  ENTREGADO: 'entregado',
} as const;

export const TIPOS_TURNO = {
  MATUTINO: 'matutino',
  VESPERTINO: 'vespertino',
} as const;

// ============================================
// CONSTANTES DE INVENTARIO
// ============================================

export const CATEGORIAS_INGREDIENTES = {
  BEBIDAS: 'BEBIDAS',
  ABARROTES: 'ABARROTES',
  SALSAS_Y_ADEREZOS: 'SALSAS Y ADEREZOS',
  VERDURAS: 'VERDURAS',
  ESPECIAS: 'ESPECIAS',
  INSUMOS_EMPAQUE: 'INSUMOS EMPAQUE',
  PROTEINAS: 'PROTEINAS',
  CONGELADOS: 'CONGELADOS',
  POSTRES: 'POSTRES',
  INSUMOS_PREPRODUCCION: 'INSUMOS PREPRODUCCION',
} as const;

export const UNIDADES_MEDIDA = {
  KILO: 'KILO',
  LITRO: 'LITRO',
  PIEZA: 'PIEZA',
  GRAMO: 'GRAMO',
  MILILITRO: 'MILILITRO',
} as const;

export const TIPOS_MOVIMIENTO = {
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA',
  AJUSTE: 'AJUSTE',
  MERMA: 'MERMA',
  TRASPASO: 'TRASPASO',
  VENTA: 'VENTA',
} as const;

export const ESTADOS_ORDEN_COMPRA = {
  PENDIENTE: 'PENDIENTE',
  APROBADA: 'APROBADA',
  ENVIADA: 'ENVIADA',
  RECIBIDA: 'RECIBIDA',
  CANCELADA: 'CANCELADA',
} as const;

export const TIPOS_CONTEO = {
  COMPLETO: 'COMPLETO',
  PARCIAL: 'PARCIAL',
  CICLICO: 'CICLICO',
} as const;

export const ESTADOS_CONTEO = {
  EN_PROCESO: 'EN_PROCESO',
  COMPLETADO: 'COMPLETADO',
  REVISADO: 'REVISADO',
} as const;

export const CATEGORIAS_RECETAS = {
  BURGERS: 'BURGERS',
  PARRILLA: 'PARRILLA',
  FREIDORA: 'FREIDORA',
  GUARNICIONES: 'GUARNICIONES',
  SALSAS: 'SALSAS',
  SUBRECETAS: 'SUBRECETAS',
} as const;

export const UBICACIONES_ALMACEN = {
  ALMACEN: 'Almacén',
  REFRIGERADOR: 'Refrigerador',
  CONGELADOR: 'Congelador',
  AREA_PREP: 'Área de Preparación',
  BARRA: 'Barra',
} as const;
