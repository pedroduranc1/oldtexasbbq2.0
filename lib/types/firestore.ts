/**
 * Tipos TypeScript para el esquema de Firestore
 * Old Texas BBQ - CRM
 *
 * Estos tipos reflejan la estructura de datos definida en docs/FIRESTORE_SCHEMA.md
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// ENUMS Y TIPOS BASE
// ============================================================================

export type Rol = 'admin' | 'encargado' | 'cajera' | 'cocina' | 'repartidor';

export type CanalVenta =
  | 'whatsapp'
  | 'mostrador'
  | 'uber'
  | 'didi'
  | 'llamada'
  | 'web';

export type EstadoPedido =
  | 'pendiente'
  | 'en_preparacion'
  | 'listo'
  | 'en_reparto'
  | 'entregado'
  | 'cancelado';

/**
 * Método de cobro real al cliente.
 * 'efectivo' y 'tarjeta' son los únicos métodos directos.
 * 'transferencia' aplica cuando el pago llega por depósito bancario
 * (proveedores como Clip, Uber, Didi liquidan por esta vía).
 * 'uber' y 'didi' se conservan por compatibilidad con datos históricos;
 * contablemente esas ventas llegan como transferencia en el flujo semanal.
 */
export type MetodoPago =
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'uber'    // legado — depósito semanal por transferencia
  | 'didi';   // legado — depósito semanal por transferencia

/**
 * Forma en que el dinero de tarjeta llega a la cuenta.
 * Clip deposita D+1 descontando 3.6% + IVA.
 */
export type SubmetodoTarjeta = 'clip_link' | 'clip_terminal' | 'otro';

export type EstadoReparto =
  | 'asignado'
  | 'recogido'
  | 'en_camino'
  | 'entregado';

export type TipoTurno = 'matutino' | 'vespertino' | 'nocturno';

export type EstadoTurno = 'abierto' | 'cerrado';

export type TipoNotificacion =
  | 'nuevo_pedido'
  | 'pedido_listo'
  | 'pedido_entregado'
  | 'pedido_cancelado'
  | 'alerta'
  | 'info';

export type PrioridadNotificacion = 'baja' | 'normal' | 'alta' | 'urgente';

export type TipoPersonalizacion =
  | 'salsa'
  | 'extra'
  | 'presentacion'
  | 'temperatura'
  | 'modificador';

export type TipoComision = 'fijo' | 'porcentaje';

export type TipoDescuento = 'porcentaje' | 'monto_fijo';

export type TipoTransaccion = 'venta' | 'gasto' | 'retiro' | 'ajuste';

export type CategoriaConfig =
  | 'general'
  | 'pedidos'
  | 'reparto'
  | 'pagos'
  | 'notificaciones';

export type TipoConfig =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object';

export type AccionHistorial =
  | 'creado'
  | 'actualizado'
  | 'cambio_estado'
  | 'asignado'
  | 'cancelado';

// ============================================================================
// COLECCIÓN: USUARIOS
// ============================================================================

export interface Usuario {
  // Identificación
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;

  // Rol y permisos
  rol: Rol;
  activo: boolean;

  // Turnos (solo para cajeras)
  turnoPreferido?: TipoTurno;

  // Metadata
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  creadoPor: string;
  ultimaConexion: Timestamp;

  // FCM para notificaciones
  fcmTokens: string[];
}

// ============================================================================
// COLECCIÓN: PEDIDOS
// ============================================================================

export interface ClientePedido {
  nombre: string;
  telefono: string;
  direccion?: string;
  colonia?: string;
  referencia?: string;
}

export interface DescuentoPedido {
  tipo: TipoDescuento;
  valor: number; // Porcentaje (0-100) o monto fijo
  monto: number; // Monto final del descuento en pesos
}

export interface TotalesPedido {
  subtotal: number;
  envio: number;
  descuento: number;
  total: number;
}

export interface PagoPedido {
  metodo: MetodoPago;
  requiereCambio: boolean;
  montoRecibido?: number;
  cambio?: number;
  cambioEntregado?: boolean;  // true cuando el cajero confirma que entregó el cambio
  pagoAdelantado: boolean;
  comprobantePago?: string;
}

export interface RepartoPedido {
  repartidorId: string;
  repartidorNombre: string;
  comisionRepartidor: number;
  estadoReparto: EstadoReparto;
  horaAsignacion: Timestamp;
  horaRecogida?: Timestamp;
  horaEntrega?: Timestamp;
  liquidado: boolean;
  fechaLiquidacion?: Timestamp;
}

export interface Pedido {
  // Identificación
  id: string;
  numeroPedido: number;

  // Origen del pedido
  canal: CanalVenta;

  // Cliente
  cliente: ClientePedido;

  // Estado del pedido
  estado: EstadoPedido;

  // Totales
  totales: TotalesPedido;

  // Descuento (opcional)
  descuento?: DescuentoPedido;

  // Pago
  pago: PagoPedido;

  // Reparto (opcional)
  reparto?: RepartoPedido;

  // Observaciones
  observaciones?: string;
  observacionesInternas?: string;

  // Timestamps
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  horaRecepcion: Timestamp;
  horaInicioCocina?: Timestamp;
  horaListo?: Timestamp;
  horaEntrega?: Timestamp;

  // Metadata
  creadoPor: string;
  turnoId: string;
  cancelado: boolean;
  motivoCancelacion?: string;
}

// ============================================================================
// SUBCOLECCIÓN: ITEMS DE PEDIDO
// ============================================================================

export interface PersonalizacionesItem {
  salsa?: string[];
  presentacion?: string;
  temperatura?: string;
  extras?: string[];
  sinIngredientes?: string[];
}

export interface ItemPedido {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  personalizaciones?: PersonalizacionesItem;
  notas?: string;
}

// ============================================================================
// SUBCOLECCIÓN: HISTORIAL DE PEDIDO
// ============================================================================

export interface HistorialPedido {
  id: string;
  timestamp: Timestamp;
  accion: AccionHistorial;
  estadoAnterior?: string;
  estadoNuevo?: string;
  usuarioId: string;
  usuarioNombre: string;
  detalles?: string;
}

// ============================================================================
// COLECCIÓN: PRODUCTOS
// ============================================================================

export interface Producto {
  // Identificación
  id: string;
  sku?: string;
  nombre: string;
  descripcion: string;

  // Categorización
  categoriaId: string;
  categoriaNombre: string;
  subcategoria?: string;

  // Precio
  precio: number;
  precioPromocion?: number;
  enPromocion: boolean;

  // Disponibilidad
  disponible: boolean;
  stock?: number;
  stockMinimo?: number;

  // Multimedia
  imagen?: string;
  imagenes?: string[];

  // Personalizaciones
  permitePersonalizacion: boolean;

  // Metadata
  popularidad: number;
  orden: number;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  creadoPor: string;

  // SEO
  etiquetas?: string[];
  ingredientes?: string[];

  // Soft Delete
  eliminado?: boolean;
  fechaEliminacion?: Timestamp;
  eliminadoPor?: string;

  // Variantes (tamaños, extras)
  tieneVariantes?: boolean;
  variantes?: VarianteProducto[];

  // Audit Log
  historialCambios?: CambioProducto[];

  // Rastreo de ventas por turno y por día
  // { "turno_2025-07-06_matutino": 12, "turno_2025-07-06_vespertino": 8 }
  cantidadVendidaPorTurno?: Record<string, number>;
  // { "2025-07-06": 20, "2025-07-05": 15 }
  cantidadVendidaPorDia?: Record<string, number>;
}

/**
 * Variante de producto (tamaños, extras, etc.)
 */
export interface VarianteProducto {
  id: string;
  nombre: string; // Ej: "Grande", "Mediano", "Con extra queso"
  tipo: 'tamaño' | 'extra' | 'personalizado';
  precio: number; // Precio de esta variante (puede ser diferente al base)
  precioDiferencia?: number; // Diferencia respecto al precio base (+/-)
  disponible: boolean;
  orden: number;
}

/**
 * Registro de cambio en producto (para audit log)
 */
export interface CambioProducto {
  fecha: Timestamp;
  usuarioId: string;
  usuarioNombre: string;
  campo: string;
  valorAnterior: any;
  valorNuevo: any;
  accion: 'crear' | 'actualizar' | 'eliminar' | 'restaurar';
}

// ============================================================================
// SUBCOLECCIÓN: PERSONALIZACIONES DE PRODUCTO
// ============================================================================

export interface OpcionPersonalizacion {
  valor: string;
  precioAdicional: number;
  disponible: boolean;
}

export interface PersonalizacionProducto {
  id: string;
  tipo: TipoPersonalizacion;
  nombre: string;
  opciones: OpcionPersonalizacion[];
  obligatorio: boolean;
  multipleSeleccion: boolean;
  maximoSelecciones?: number;
}

// ============================================================================
// COLECCIÓN: CATEGORÍAS
// ============================================================================

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  orden: number;
  activa: boolean;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

// ============================================================================
// COLECCIÓN: REPARTIDORES
// ============================================================================

export interface Repartidor {
  // Identificación
  id: string;
  usuarioId?: string;
  nombre: string;
  apellido: string;
  telefono: string;

  // Estado
  activo: boolean;
  disponible: boolean;

  // Comisiones
  comisionPorDefecto: number;
  tipoComision: TipoComision;

  // Estadísticas
  pedidosCompletados: number;
  pedidosCancelados: number;
  calificacionPromedio?: number;

  // Liquidación
  saldoPendiente: number;
  ultimaLiquidacion?: Timestamp;

  // Metadata
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  creadoPor: string;
}

// ============================================================================
// COLECCIÓN: TURNOS
// ============================================================================

export interface ResumenTurno {
  totalPedidos: number;
  totalVentas: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  uber: number;
  didi: number;
  totalEnvios: number;
  totalDescuentos: number;
  totalComisionesRepartidores: number;
}

export interface CorteCaja {
  efectivoEsperado: number;
  efectivoReal: number;
  diferencia: number;
  observaciones?: string;
  /** UID del usuario que cerró el turno */
  cerradoPor: string;
  /** Nombre completo de quien cerró, resuelto desde la sesión activa al momento del cierre */
  cerradoPorNombre: string;
  horaCierre: Timestamp;
  /** Justificación del descuadre — requerida para |diferencia| >= $50 */
  justificacion?: string;
  /** ID del usuario que registró la justificación */
  justificadoPor?: string;
  /** Timestamp en que se justificó */
  fechaJustificacion?: Timestamp;
}

export interface Turno {
  // Identificación
  id: string;
  tipo: TipoTurno;
  fecha: string; // "YYYY-MM-DD"

  // Responsables
  cajeroId: string;
  cajeroNombre: string;
  encargadoId?: string;
  encargadoNombre?: string;

  // Horarios
  horaInicio: Timestamp;
  horaFin?: Timestamp;

  // Estado
  estado: EstadoTurno;

  // Fondos
  fondoInicial: number;

  // Resumen de ventas
  resumen: ResumenTurno;

  // Corte de caja
  corte?: CorteCaja;

  // Metadata
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

// ============================================================================
// SUBCOLECCIÓN: TRANSACCIONES DE TURNO
// ============================================================================

export interface TransaccionTurno {
  id: string;
  tipo: TipoTransaccion;
  monto: number;
  metodoPago?: string;
  pedidoId?: string;
  descripcion: string;
  timestamp: Timestamp;
  usuarioId: string;
}

// ============================================================================
// COLECCIÓN: COLONIAS
// ============================================================================

export interface Colonia {
  // Identificación
  id: string;
  nombre: string;

  // Costo de envío
  costoEnvio: number;

  // Zona geográfica (opcional)
  zona?: string; // ej: "Norte", "Sur", "Centro", "Este", "Oeste"

  // Estado
  activa: boolean;

  // Metadata
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  creadoPor: string;
}

// ============================================================================
// COLECCIÓN: NOTIFICACIONES
// ============================================================================

export interface Notificacion {
  // Identificación
  id: string;

  // Destinatario
  usuarioId?: string;
  rol?: Rol;

  // Contenido
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;

  // Referencia
  pedidoId?: string;
  turnoId?: string;

  // Estado
  leida: boolean;
  fechaLeida?: Timestamp;

  // Prioridad
  prioridad: PrioridadNotificacion;

  // Metadata
  timestamp: Timestamp;
  expiraEn?: Timestamp;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

// ============================================================================
// COLECCIÓN: CONFIGURACIÓN
// ============================================================================

export interface Configuracion<T = any> {
  id: string;
  categoria: CategoriaConfig;
  valor: T;
  descripcion: string;
  tipo: TipoConfig;
  editable: boolean;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  actualizadoPor: string;
}

// ============================================================================
// TIPOS AUXILIARES PARA FORMULARIOS Y UI
// ============================================================================

/**
 * Tipo para crear un nuevo pedido (sin campos auto-generados)
 */
export type NuevoPedido = Omit<
  Pedido,
  'id' | 'numeroPedido' | 'fechaCreacion' | 'fechaActualizacion'
>;

/**
 * Tipo para actualizar un pedido (todos los campos opcionales excepto id)
 */
export type ActualizarPedido = Partial<Omit<Pedido, 'id'>> & { id: string };

/**
 * Tipo para crear un nuevo producto
 */
export type NuevoProducto = Omit<
  Producto,
  'id' | 'fechaCreacion' | 'fechaActualizacion'
>;

/**
 * Tipo para crear un nuevo usuario
 */
export type NuevoUsuario = Omit<
  Usuario,
  'id' | 'fechaCreacion' | 'fechaActualizacion' | 'ultimaConexion'
>;

/**
 * Tipo para crear un nuevo repartidor
 */
export type NuevoRepartidor = Omit<
  Repartidor,
  'id' | 'fechaCreacion' | 'fechaActualizacion'
>;

/**
 * Tipo para crear un nuevo turno
 */
export type NuevoTurno = Omit<Turno, 'id' | 'fechaCreacion' | 'fechaActualizacion'>;

/**
 * Tipo para datos de pedido en tiempo real (con datos calculados)
 */
export interface PedidoConDatos extends Pedido {
  items: ItemPedido[];
  tiempoEspera?: number; // En minutos
  tiempoPreparacion?: number; // En minutos
  tiempoEntrega?: number; // En minutos
}

/**
 * Tipo para resumen de repartidor con estadísticas
 */
export interface RepartidorConEstadisticas extends Repartidor {
  pedidosHoy: number;
  pedidosSemana: number;
  ingresosDia: number;
  ingresosSemana: number;
}

/**
 * Tipo para estadísticas del turno
 */
export interface EstadisticasTurno {
  turno: Turno;
  pedidosPorHora: { hora: string; cantidad: number }[];
  productosMasVendidos: { producto: string; cantidad: number }[];
  ventasPorCanal: { canal: CanalVenta; total: number }[];
  tiempoPromedioEntrega: number;
}

// ============================================================================
// CONSTANTES Y HELPERS
// ============================================================================

/**
 * Estados que puede tener un pedido en cada fase
 */
export const ESTADOS_PEDIDO: Record<string, EstadoPedido[]> = {
  caja: ['pendiente', 'cancelado'],
  cocina: ['pendiente', 'en_preparacion', 'listo'],
  reparto: ['listo', 'en_reparto', 'entregado'],
};

/**
 * Colores por estado de pedido (para UI)
 */
export const COLORES_ESTADO: Record<EstadoPedido, string> = {
  pendiente: '#F59E0B', // Amber
  en_preparacion: '#3B82F6', // Blue
  listo: '#10B981', // Green
  en_reparto: '#8B5CF6', // Purple
  entregado: '#059669', // Emerald
  cancelado: '#EF4444', // Red
};

/**
 * Iconos por canal de venta (nombres de lucide-react)
 */
export const ICONOS_CANAL: Record<CanalVenta, string> = {
  whatsapp: 'MessageCircle',
  mostrador: 'Store',
  uber: 'Car',
  didi: 'Bike',
  llamada: 'Phone',
  web: 'Globe',
};

/**
 * Labels en español por rol
 */
export const LABELS_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  encargado: 'Encargado',
  cajera: 'Cajera',
  cocina: 'Cocina',
  repartidor: 'Repartidor',
};

// ============================================================================
// MÓDULO CAJA 2.0 — Colecciones independientes
// ============================================================================

export type TipoMovimientoCaja = 'ingreso' | 'egreso';

// ============================================================================
// COLECCIÓN: MovimientosCaja
// ============================================================================

/**
 * Representa un movimiento de dinero dentro de un turno de caja.
 * Cada ingreso o egreso queda registrado con referencia al turno activo.
 *
 * MovimientosCaja es inmutable (audit trail) — un movimiento erróneo nunca
 * se edita ni se borra. En su lugar se crea un movimiento de corrección:
 * un nuevo registro de signo contrario que referencia al original mediante
 * `correccionDe`, y el original queda marcado con `corregidoPor`.
 */
export interface MovimientoCaja {
  id: string;
  turno_id: string;
  tipo: TipoMovimientoCaja;
  monto: number;
  concepto: string;        // etiqueta estandarizada (referencia a ConceptosFinancieros)
  descripcion?: string;
  fecha: Timestamp;
  usuario_id: string;
  /** ID del movimiento original que este registro corrige (anula) */
  correccionDe?: string;
  /** ID del movimiento de corrección que anula a este (se setea en el original) */
  corregidoPor?: string;
}

export type NuevoMovimientoCaja = Omit<MovimientoCaja, 'id'>;

// ============================================================================
// COLECCIÓN: CierresCaja
// ============================================================================

/**
 * Registro del cierre de un turno: conciliación entre efectivo esperado y real.
 * Se crea una sola vez por turno al momento de cerrarlo.
 */
export interface CierreCaja {
  id: string;
  turno_id: string;
  monto_esperado: number;
  monto_real: number;
  diferencia: number;      // monto_real - monto_esperado (negativo = faltante)
  notas?: string;
  fecha: Timestamp;
  usuario_id: string;        // quien realizó el cierre
  usuario_nombre: string;    // nombre completo, resuelto desde la sesión activa al cerrar
}

export type NuevoCierreCaja = Omit<CierreCaja, 'id'>;

// ============================================================================
// HELPERS CAJA 2.0
// ============================================================================

export const LABELS_TIPO_MOVIMIENTO: Record<TipoMovimientoCaja, string> = {
  ingreso: 'Ingreso',
  egreso: 'Egreso',
};

// ============================================================================
// COLECCIÓN: Anticipos
// ============================================================================

/**
 * Estado del ciclo de vida de un anticipo.
 * recibido  → el dinero entró pero el pedido aún no se ha preparado/entregado
 * aplicado  → el pedido se completó y el anticipo se descontó del saldo final
 * saldado   → el cliente cubrió el resto y el ciclo está cerrado
 * cancelado → el pedido no se realizó; el anticipo se devolvió o se registró como egreso
 */
export type EstadoAnticipo = 'recibido' | 'aplicado' | 'saldado' | 'cancelado';

export interface Anticipo {
  id: string;
  /** Nombre o referencia del cliente */
  clienteNombre: string;
  clienteTelefono?: string;
  /** Descripción del pedido o evento para el que se anticipa */
  descripcion: string;
  /** Monto del anticipo recibido */
  montoAnticipo: number;
  /** Total estimado del pedido completo */
  totalEstimado?: number;
  /** Saldo pendiente = totalEstimado - montoAnticipo (calculado en lectura) */
  metodoPago: MetodoPago;
  /** Solo cuando metodoPago === 'tarjeta' */
  submetodoTarjeta?: SubmetodoTarjeta;
  estado: EstadoAnticipo;
  /** Fecha en que se recibió el anticipo */
  fechaRecepcion: Timestamp;
  /** Fecha comprometida de entrega del pedido */
  fechaEntregaEstimada?: Timestamp;
  /** Fecha real de aplicación/saldo */
  fechaAplicacion?: Timestamp;
  /** Referencia al turno en que se recibió el anticipo */
  turnoId?: string;
  /** Referencia al pedido final, si se creó en el sistema */
  pedidoId?: string;
  /** MovimientoCaja generado al recibir el anticipo */
  movimientoCajaId?: string;
  notas?: string;
  usuarioId: string;
  usuarioNombre: string;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

export type NuevoAnticipo = Omit<Anticipo, 'id' | 'fechaCreacion' | 'fechaActualizacion'>;

// ============================================================================
// COLECCIÓN: FlujoEfectivo (periodos semanales)
// ============================================================================

/**
 * Registro del flujo de efectivo de una semana (lunes–domingo).
 * Se crea manualmente al inicio de cada semana con el saldo inicial de caja.
 * Los movimientos se calculan dinámicamente desde turnos + MovimientosCaja.
 */
export interface FlujoSemanal {
  id: string;
  /** Lunes de la semana — "YYYY-MM-DD" */
  semanaInicio: string;
  /** Domingo de la semana — "YYYY-MM-DD" */
  semanaFin: string;
  /** Efectivo físico contado en caja el lunes antes de abrir */
  saldoInicial: number;
  /** Monto cerrado/archivado — se llena al cerrar el periodo */
  saldoFinal?: number;
  estado: 'abierto' | 'cerrado';
  notas?: string;
  usuarioId: string;
  usuarioNombre: string;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}
