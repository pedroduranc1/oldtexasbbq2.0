'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useRolGuard } from '@/lib/hooks/useRolGuard';
import {
  detectarTipoCSV,
  ETIQUETAS_CSV,
  parseCajasLoyverse,
  parseMovimientosLoyverse,
  parseMetodosPagoLoyverse,
  parseRecibosLoyverse,
  parseRecibosArticuloLoyverse,
  parseResumenVentasLoyverse,
  parseVentasArticuloLoyverse,
  parseVentasCategoriaLoyverse,
  parseVentasEmpleadoLoyverse,
  parseVentasModificadorLoyverse,
  type TipoCSVLoyverse,
  type FilaCajasLoyverse,
} from '@/lib/utils/parseLoyverseCSVs';
import {
  importarLoyverse,
  type DatosImportacionLoyverse,
  type ResultadoImportacionLoyverse,
} from '@/lib/services/importacionLoyverse.service';
import {
  Upload, FileText, CheckCircle, XCircle, Loader2, ChevronRight,
  Trash2, CloudUpload, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchivoDetectado {
  nombre: string;
  tipo: TipoCSVLoyverse;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filas: any[];
  estado: 'cargado' | 'error';
  errorMsg?: string;
}

// ─── Colores por tipo ─────────────────────────────────────────────────────────

const COLOR_TIPO: Record<TipoCSVLoyverse, string> = {
  cajas:             'bg-blue-500/15 text-blue-600 border-blue-500/40',
  movimientos:       'bg-purple-500/15 text-purple-600 border-purple-500/40',
  metodos_pago:      'bg-green-500/15 text-green-600 border-green-500/40',
  recibos:           'bg-orange-500/15 text-orange-600 border-orange-500/40',
  recibos_articulo:  'bg-yellow-500/15 text-yellow-700 border-yellow-500/40',
  resumen_ventas:    'bg-teal-500/15 text-teal-600 border-teal-500/40',
  ventas_articulo:   'bg-pink-500/15 text-pink-600 border-pink-500/40',
  ventas_categoria:  'bg-indigo-500/15 text-indigo-600 border-indigo-500/40',
  ventas_empleado:   'bg-cyan-500/15 text-cyan-600 border-cyan-500/40',
  ventas_modificador:'bg-rose-500/15 text-rose-600 border-rose-500/40',
  desconocido:       'bg-muted text-muted-foreground border-border',
};

// ─── Parser por tipo ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsearCSV(tipo: TipoCSVLoyverse, texto: string): any[] {
  switch (tipo) {
    case 'cajas':             return parseCajasLoyverse(texto);
    case 'movimientos':       return parseMovimientosLoyverse(texto);
    case 'metodos_pago':      return parseMetodosPagoLoyverse(texto);
    case 'recibos':           return parseRecibosLoyverse(texto);
    case 'recibos_articulo':  return parseRecibosArticuloLoyverse(texto);
    case 'resumen_ventas':    return parseResumenVentasLoyverse(texto);
    case 'ventas_articulo':   return parseVentasArticuloLoyverse(texto);
    case 'ventas_categoria':  return parseVentasCategoriaLoyverse(texto);
    case 'ventas_empleado':   return parseVentasEmpleadoLoyverse(texto);
    case 'ventas_modificador':return parseVentasModificadorLoyverse(texto);
    default:                  return [];
  }
}

// ─── Drop Zone global ─────────────────────────────────────────────────────────

interface GlobalDropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  activo: boolean;
}

function GlobalDropzone({ onFiles, disabled, activo }: GlobalDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.toLowerCase().endsWith('.csv') || f.name.toLowerCase().endsWith('.txt')
      );
      if (files.length) onFiles(files);
    },
    [onFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  if (activo) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer',
        dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/30',
        disabled && 'opacity-50 pointer-events-none'
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt"
        multiple
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <CloudUpload className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm">Arrastra uno o varios CSV de Loyverse</p>
          <p className="text-xs text-muted-foreground mt-1">
            O haz clic para seleccionar — puedes subir todos los archivos a la vez
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 mt-1">
          {(['cajas', 'movimientos', 'recibos', 'recibos_articulo', 'resumen_ventas',
             'ventas_articulo', 'ventas_categoria', 'ventas_empleado', 'ventas_modificador', 'metodos_pago'] as TipoCSVLoyverse[])
            .map((t) => (
              <span key={t} className={cn('text-[10px] px-2 py-0.5 rounded-full border', COLOR_TIPO[t])}>
                {ETIQUETAS_CSV[t].label}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de archivo ───────────────────────────────────────────────────────

interface ArchivoCardProps {
  archivo: ArchivoDetectado;
  onRemove: () => void;
  disabled?: boolean;
}

function ArchivoCard({ archivo, onRemove, disabled }: ArchivoCardProps) {
  const meta = ETIQUETAS_CSV[archivo.tipo];
  const esError = archivo.estado === 'error';
  const esDesconocido = archivo.tipo === 'desconocido';

  return (
    <div className={cn(
      'rounded-xl border p-4 flex items-start gap-3 transition-colors',
      esError || esDesconocido ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card'
    )}>
      <div className={cn(
        'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border',
        esError || esDesconocido ? 'bg-red-500/15 text-red-600 border-red-500/40' : COLOR_TIPO[archivo.tipo]
      )}>
        {esError || esDesconocido
          ? <AlertCircle className="w-5 h-5" />
          : <CheckCircle className="w-5 h-5" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">{archivo.nombre}</p>
          <Badge
            variant="outline"
            className={cn('text-[10px] shrink-0 border', COLOR_TIPO[archivo.tipo])}
          >
            {meta.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{meta.descripcion}</p>
        {archivo.estado === 'cargado' && (
          <p className="text-xs text-green-600 mt-1 font-medium">
            {archivo.filas.length} filas listas para importar
          </p>
        )}
        {esError && (
          <p className="text-xs text-red-600 mt-1">{archivo.errorMsg}</p>
        )}
        {esDesconocido && (
          <p className="text-xs text-red-600 mt-1">
            No se pudo identificar el tipo de CSV. Verifica que sea un archivo exportado desde Loyverse.
          </p>
        )}
      </div>

      <button
        className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        onClick={onRemove}
        disabled={disabled}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Preview de turnos ────────────────────────────────────────────────────────

function PreviewTurnos({ filas }: { filas: FilaCajasLoyverse[] }) {
  if (!filas.length) return null;
  return (
    <div className="mt-2 rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fecha</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Abierto por</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cerrado por</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Efectivo real</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Descuadre</th>
            </tr>
          </thead>
          <tbody>
            {filas.slice(0, 6).map((f, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-1.5">{f.fecha || f.horaApertura}</td>
                <td className="px-3 py-1.5">{f.abiertoPor || '—'}</td>
                <td className="px-3 py-1.5">{f.cerradoPor || '—'}</td>
                <td className="px-3 py-1.5 text-right">${f.efectivoReal.toFixed(2)}</td>
                <td className={cn('px-3 py-1.5 text-right font-medium', f.descuadre < 0 ? 'text-red-600' : 'text-green-600')}>
                  ${f.descuadre.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length > 6 && (
          <p className="text-xs text-muted-foreground px-3 py-2">
            … y {filas.length - 6} filas más
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Resultado card ───────────────────────────────────────────────────────────

function ResultadoCard({ resultado }: { resultado: ResultadoImportacionLoyverse }) {
  const hayErrores = resultado.errores.length > 0;

  const contadores = [
    { label: 'Turnos',           v: resultado.turnos.importados,           o: resultado.turnos.omitidos },
    { label: 'Movimientos',      v: resultado.movimientos.importados,      o: resultado.movimientos.omitidos },
    { label: 'Resúmenes actualizados', v: resultado.metodos.actualizados,  o: resultado.metodos.sinTurno },
    { label: 'Recibos',          v: resultado.recibos.importados,          o: resultado.recibos.omitidos },
    { label: 'Items recibos',    v: resultado.recibosArticulo.importados,  o: resultado.recibosArticulo.omitidos },
    { label: 'Resumen ventas',   v: resultado.resumenVentas.importados,    o: resultado.resumenVentas.omitidos },
    { label: 'Por artículo',     v: resultado.ventasArticulo.importados,   o: resultado.ventasArticulo.omitidos },
    { label: 'Por categoría',    v: resultado.ventasCategoria.importados,  o: resultado.ventasCategoria.omitidos },
    { label: 'Por empleado',     v: resultado.ventasEmpleado.importados,   o: resultado.ventasEmpleado.omitidos },
    { label: 'Por modificador',  v: resultado.ventasModificador.importados,o: resultado.ventasModificador.omitidos },
  ].filter((c) => c.v > 0 || c.o > 0);

  return (
    <Card className={cn(hayErrores ? 'border-yellow-500/50' : 'border-green-500/50')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {hayErrores
            ? <XCircle className="w-5 h-5 text-yellow-500" />
            : <CheckCircle className="w-5 h-5 text-green-500" />}
          Importación {hayErrores ? 'con advertencias' : 'completada'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {contadores.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {contadores.map((c) => (
              <div key={c.label} className="rounded-lg bg-muted/60 p-3 text-center">
                <p className="text-2xl font-bold">{c.v}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
                {c.o > 0 && <p className="text-[10px] text-muted-foreground">{c.o} ya existían</p>}
              </div>
            ))}
          </div>
        )}

        {hayErrores && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 space-y-1 max-h-40 overflow-y-auto">
            {resultado.errores.map((e, i) => (
              <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400">{e}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportarPage() {
  const { userData } = useAuthStore();
  useRolGuard(['admin', 'encargado']);

  const [archivos, setArchivos] = useState<ArchivoDetectado[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacionLoyverse | null>(null);

  const leerArchivo = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsText(file, 'utf-8');
    });

  const procesarArchivos = useCallback(async (files: File[]) => {
    const nuevos: ArchivoDetectado[] = [];

    for (const file of files) {
      // Evitar duplicados por nombre
      const yaCargado = archivos.some((a) => a.nombre === file.name);
      if (yaCargado) continue;

      try {
        const texto = await leerArchivo(file);
        const tipo = detectarTipoCSV(texto);

        if (tipo === 'desconocido') {
          nuevos.push({ nombre: file.name, tipo, filas: [], estado: 'error' });
          continue;
        }

        const filas = parsearCSV(tipo, texto);
        if (!filas.length) {
          nuevos.push({
            nombre: file.name, tipo, filas: [], estado: 'error',
            errorMsg: 'No se encontraron filas. Verifica el formato del CSV.',
          });
          continue;
        }

        nuevos.push({ nombre: file.name, tipo, filas, estado: 'cargado' });
      } catch (e) {
        nuevos.push({
          nombre: file.name, tipo: 'desconocido', filas: [], estado: 'error',
          errorMsg: (e as Error).message,
        });
      }
    }

    if (nuevos.length) setArchivos((prev) => [...prev, ...nuevos]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivos]);

  const removerArchivo = (idx: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const archivosValidos = archivos.filter((a) => a.estado === 'cargado' && a.tipo !== 'desconocido');

  const ejecutarImportacion = async () => {
    if (!userData?.id || !archivosValidos.length) return;
    setImportando(true);
    setResultado(null);

    try {
      const datos: DatosImportacionLoyverse = {};

      for (const arch of archivosValidos) {
        switch (arch.tipo) {
          case 'cajas':             datos.cajas = arch.filas; break;
          case 'movimientos':       datos.movimientos = arch.filas; break;
          case 'metodos_pago':      datos.metodos = arch.filas; break;
          case 'recibos':           datos.recibos = arch.filas; break;
          case 'recibos_articulo':  datos.recibosArticulo = arch.filas; break;
          case 'resumen_ventas':    datos.resumenVentas = arch.filas; break;
          case 'ventas_articulo':   datos.ventasArticulo = arch.filas; break;
          case 'ventas_categoria':  datos.ventasCategoria = arch.filas; break;
          case 'ventas_empleado':   datos.ventasEmpleado = arch.filas; break;
          case 'ventas_modificador':datos.ventasModificador = arch.filas; break;
        }
      }

      const res = await importarLoyverse(datos, userData.id);
      setResultado(res);
    } catch (e) {
      setResultado({
        turnos:           { importados: 0, omitidos: 0 },
        movimientos:      { importados: 0, omitidos: 0 },
        metodos:          { actualizados: 0, sinTurno: 0 },
        recibos:          { importados: 0, omitidos: 0 },
        recibosArticulo:  { importados: 0, omitidos: 0 },
        resumenVentas:    { importados: 0, omitidos: 0 },
        ventasArticulo:   { importados: 0, omitidos: 0 },
        ventasCategoria:  { importados: 0, omitidos: 0 },
        ventasEmpleado:   { importados: 0, omitidos: 0 },
        ventasModificador:{ importados: 0, omitidos: 0 },
        errores:          [(e as Error).message],
      });
    } finally {
      setImportando(false);
    }
  };

  const archivosDeCajas = archivosValidos.filter((a) => a.tipo === 'cajas');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Importar desde Loyverse</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Arrastra uno o varios CSV exportados desde Loyverse. El sistema detecta el tipo
          automáticamente y permite subir todos a la vez.
        </p>
      </div>

      {/* Drop zone */}
      <GlobalDropzone
        onFiles={procesarArchivos}
        disabled={importando}
        activo={archivos.length > 0}
      />

      {/* Lista de archivos */}
      {archivos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {archivos.length} {archivos.length === 1 ? 'archivo' : 'archivos'} cargado{archivos.length !== 1 ? 's' : ''}
            </p>
            {!importando && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv,.txt';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = Array.from((e.target as HTMLInputElement).files ?? []);
                    if (files.length) procesarArchivos(files);
                  };
                  input.click();
                }}
              >
                <Upload className="w-3 h-3" />
                Agregar más
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {archivos.map((arch, i) => (
              <div key={`${arch.nombre}-${i}`}>
                <ArchivoCard
                  archivo={arch}
                  onRemove={() => removerArchivo(i)}
                  disabled={importando}
                />
                {arch.tipo === 'cajas' && arch.estado === 'cargado' && (
                  <PreviewTurnos filas={arch.filas as FilaCajasLoyverse[]} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel de importación */}
      {archivosValidos.length > 0 && !resultado && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium">Listo para importar</p>
                <div className="flex flex-wrap gap-1">
                  {archivosValidos.map((a) => (
                    <Badge key={a.nombre} variant="outline" className={cn('text-[10px] border', COLOR_TIPO[a.tipo])}>
                      {ETIQUETAS_CSV[a.tipo].label} · {a.filas.length}
                    </Badge>
                  ))}
                </div>
                {archivosDeCajas.length === 0 && archivosValidos.some((a) =>
                  ['recibos', 'movimientos', 'metodos_pago'].includes(a.tipo)
                ) && (
                  <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    Importar el CSV de Cajas primero crea los turnos para enlazar los datos
                  </p>
                )}
              </div>
              <Button
                onClick={ejecutarImportacion}
                disabled={importando}
                className="shrink-0 gap-2"
              >
                {importando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando…
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Importar datos
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="space-y-3">
          <ResultadoCard resultado={resultado} />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setResultado(null);
              setArchivos([]);
            }}
          >
            Nueva importación
          </Button>
        </div>
      )}
    </div>
  );
}
