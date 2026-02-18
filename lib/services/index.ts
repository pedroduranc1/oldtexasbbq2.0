/**
 * Exportación centralizada de todos los servicios
 * Old Texas BBQ - CRM
 */

// Servicio base
export { BaseService } from './base.service';
export type { QueryOptions, PaginatedResult, BaseDocument } from './base.service';

// Servicios específicos
export { usuariosService } from './usuarios.service';
export { pedidosService } from './pedidos.service';
export { productosService } from './productos.service';
export { categoriasService } from './categorias.service';
export { repartidoresService } from './repartidores.service';
export { turnosService } from './turnos.service';
export { notificacionesService } from './notificaciones.service';
export { configuracionService } from './configuracion.service';

// Servicios de inventario
export { ingredientesService } from './ingredientes.service';
export { recetasService } from './recetas.service';
export { movimientosService } from './movimientos.service';
export { ordenesCompraService } from './ordenesCompra.service';
export { proveedoresService } from './proveedoresService';
export { conteoFisicoService } from './conteoFisicoService';
export type { FiltrosProveedores } from './proveedoresService';
export type { FiltrosConteo } from './conteoFisicoService';

// Re-exportar tipos de Firestore para conveniencia
export type {
  Usuario,
  Pedido,
  ItemPedido,
  HistorialPedido,
  Producto,
  PersonalizacionProducto,
  Categoria,
  Repartidor,
  Turno,
  TransaccionTurno,
  Notificacion,
  Configuracion,
  NuevoPedido,
  NuevoProducto,
  NuevoUsuario,
  NuevoRepartidor,
  NuevoTurno,
  PedidoConDatos,
  RepartidorConEstadisticas,
  EstadisticasTurno,
} from '@/lib/types/firestore';
