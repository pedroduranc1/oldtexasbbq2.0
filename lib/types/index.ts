// Tipos principales del sistema

export type Role = 'cajera' | 'cocina' | 'repartidor' | 'encargado' | 'admin';

export type Canal =
  | 'whatsapp'
  | 'llamada'
  | 'mostrador'
  | 'uber'
  | 'didi'
  | 'web';

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'app';

export type EstadoPedido =
  | 'recibido'
  | 'en_preparacion'
  | 'listo'
  | 'en_reparto'
  | 'entregado'
  | 'cancelado';

export type EstadoReparto = 'pendiente' | 'en_camino' | 'entregado';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  activo: boolean;
  createdAt: Date;
}

export interface Cliente {
  nombre: string;
  telefono: string; // Encriptado
  direccion: string;
}

export interface ItemPedido {
  producto: string;
  cantidad: number;
  personalizacion?: string;
  precio_unitario: number;
}

export interface Totales {
  subtotal: number;
  envio: number;
  total: number;
}

export interface Pago {
  metodo: MetodoPago;
  requiere_cambio: boolean;
  monto_recibido: number;
}

export interface Reparto {
  repartidor?: string;
  estado: EstadoReparto;
  hora_salida?: Date;
  hora_entrega?: Date;
  pago_adelantado: boolean;
  comision?: number;
  liquidado: boolean;
}

export interface Pedido {
  id: string;
  fecha_hora: Date;
  canal: Canal;
  cliente: Cliente;
  items: ItemPedido[];
  totales: Totales;
  pago: Pago;
  reparto?: Reparto;
  estado_pedido: EstadoPedido;
  observaciones?: string;
  createdBy: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  disponible: boolean;
  foto?: string;
}

export interface Personalizacion {
  id: string;
  nombre: string;
  tipo: 'salsa' | 'extra' | 'presentacion';
  precio_adicional: number;
}

export interface Turno {
  id: string;
  tipo: 'matutino' | 'vespertino';
  fecha: Date;
  fondo_inicial: number;
  cajero: string;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_app: number;
  efectivo_real: number;
  diferencia: number;
  cerrado: boolean;
  hora_cierre?: Date;
}

// ============================================
// TIPOS DE INVENTARIO
// ============================================

export type CategoriaIngrediente =
  | 'BEBIDAS'
  | 'ABARROTES'
  | 'SALSAS Y ADEREZOS'
  | 'VERDURAS'
  | 'ESPECIAS'
  | 'INSUMOS EMPAQUE'
  | 'PROTEINAS'
  | 'CONGELADOS'
  | 'POSTRES'
  | 'INSUMOS PREPRODUCCION';

export type UnidadMedida = 'KILO' | 'LITRO' | 'PIEZA' | 'GRAMO' | 'MILILITRO';

export type TipoMovimiento =
  | 'ENTRADA'
  | 'SALIDA'
  | 'AJUSTE'
  | 'MERMA'
  | 'TRASPASO'
  | 'VENTA';

export type EstadoOrdenCompra =
  | 'PENDIENTE'
  | 'APROBADA'
  | 'ENVIADA'
  | 'RECIBIDA'
  | 'CANCELADA';

export type TipoConteo = 'COMPLETO' | 'PARCIAL' | 'CICLICO';

export type EstadoConteo = 'EN_PROCESO' | 'COMPLETADO' | 'REVISADO';

export type CategoriaReceta =
  | 'BURGERS'
  | 'PARRILLA'
  | 'FREIDORA'
  | 'GUARNICIONES'
  | 'SALSAS'
  | 'SUBRECETAS';

export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string;
}

export interface UltimaCompra {
  fecha: Date;
  cantidad: number;
  precioTotal: number;
}

export interface Ingrediente {
  id: string;
  nombre: string;
  categoria: CategoriaIngrediente;
  unidadMedida: UnidadMedida;
  precioPorUnidad: number;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  proveedor?: Proveedor;
  ubicacion?: string; // Almacén, Refrigerador, Congelador
  lote?: string;
  fechaVencimiento?: Date;
  activo: boolean;
  creadoPor: string;
  fechaCreacion: Date;
  ultimaActualizacion: Date;
  ultimaCompra?: UltimaCompra;
}

export interface IngredienteReceta {
  ingredienteId: string;
  ingredienteNombre: string;
  cantidad: number;
  unidadMedida: UnidadMedida;
  costoUnitario: number;
  costoTotal: number;
}

export interface Receta {
  id: string;
  nombre: string;
  productoId: string; // Referencia a producto del menú
  categoria: CategoriaReceta;
  ingredientes: IngredienteReceta[];
  costoTotal: number; // Suma de todos los ingredientes
  rendimiento?: number; // Cuántas porciones produce
  esSubreceta: boolean; // Si es ingrediente compuesto
  tiempoPreparacion?: number; // Minutos
  instrucciones?: string;
  activo: boolean;
  creadoPor: string;
  fechaCreacion: Date;
  ultimaActualizacion: Date;
}

export interface ProveedorMovimiento {
  id: string;
  nombre: string;
}

export interface MovimientoInventario {
  id: string;
  tipo: TipoMovimiento;
  ingredienteId: string;
  ingredienteNombre: string;
  cantidad: number;
  unidadMedida: UnidadMedida;
  stockAnterior: number;
  stockNuevo: number;
  costoUnitario?: number;
  costoTotal?: number;
  motivo: string;
  referencia?: string; // ID de pedido, compra, etc.
  usuarioId: string;
  usuarioNombre: string;
  fecha: Date;
  notas?: string;
  proveedor?: ProveedorMovimiento;
  documentoCompra?: string; // Número de factura
}

export interface ItemOrdenCompra {
  ingredienteId: string;
  ingredienteNombre: string;
  cantidadSolicitada: number;
  cantidadRecibida?: number;
  unidadMedida: UnidadMedida;
  precioUnitario: number;
  subtotal: number;
}

export interface OrdenCompra {
  id: string;
  numeroOrden: number;
  proveedorId: string;
  proveedorNombre: string;
  items: ItemOrdenCompra[];
  subtotal: number;
  iva: number;
  total: number;
  estado: EstadoOrdenCompra;
  fechaSolicitud: Date;
  fechaEntregaEstimada?: Date;
  fechaRecepcion?: Date;
  solicitadoPor: string;
  aprobadoPor?: string;
  recibidoPor?: string;
  notas?: string;
  documentoFactura?: string;
}

export interface ContactoProveedor {
  nombre: string;
  telefono: string;
  email: string;
}

export interface ProveedorCompleto {
  id: string;
  nombre: string;
  razonSocial: string;
  rfc?: string;
  contacto: ContactoProveedor;
  direccion?: string;
  categorias: CategoriaIngrediente[]; // Qué tipo de productos provee
  activo: boolean;
  calificacion?: number;
  tiempoEntrega?: number; // Días promedio
  notas?: string;
  creadoPor: string;
  fechaCreacion: Date;
}

export interface ConteoItem {
  ingredienteId: string;
  ingredienteNombre: string;
  stockSistema: number;
  stockFisico: number;
  diferencia: number;
  valorDiferencia: number;
  motivo?: string;
  ajustado: boolean;
}

export interface ConteoFisico {
  id: string;
  fecha: Date;
  tipo: TipoConteo;
  estado: EstadoConteo;
  conteos: ConteoItem[];
  totalDiferencias: number;
  valorTotalDiferencias: number;
  realizadoPor: string;
  revisadoPor?: string;
  notas?: string;
  fechaInicio: Date;
  fechaFin?: Date;
}

// Filtros para queries

export interface FiltrosIngredientes {
  categoria?: CategoriaIngrediente;
  stockBajo?: boolean;
  sinStock?: boolean;
  activo?: boolean;
  busqueda?: string;
}

export interface FiltrosRecetas {
  categoria?: CategoriaReceta;
  productoId?: string;
  esSubreceta?: boolean;
  activo?: boolean;
  busqueda?: string;
}

export interface FiltrosMovimientos {
  tipo?: TipoMovimiento;
  ingredienteId?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  usuarioId?: string;
}
