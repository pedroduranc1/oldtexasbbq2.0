'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';
import { parseCajaCSV, type FilaCajaCSV } from '@/lib/utils/parseCajaCSV';
import { importarFilasCSV } from '@/lib/services/importacionCaja.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useRolGuard } from '@/lib/hooks/useRolGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

type Etapa = 'idle' | 'preview' | 'importing' | 'done';

export function ImportarCSV() {
  const { userData } = useAuthStore();
  const { allowed } = useRolGuard(['admin', 'encargado']);
  const inputRef = useRef<HTMLInputElement>(null);

  const [etapa, setEtapa] = useState<Etapa>('idle');
  const [filas, setFilas] = useState<FilaCajaCSV[]>([]);
  const [erroresImport, setErroresImport] = useState<string[]>([]);
  const [resumen, setResumen] = useState<{ importados: number; omitidos: number } | null>(null);

  if (!allowed) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Logs de diagnóstico solo en desarrollo — evitan exponer montos y
      // nombres de cajeros en la consola del navegador en producción.
      if (process.env.NODE_ENV !== 'production') {
        const primerasLineas = text.split(/\r?\n/).slice(0, 3);
        console.log('[ImportarCSV] Primeras líneas del CSV:', primerasLineas);
      }
      try {
        const parsed = parseCajaCSV(text);
        if (parsed.length === 0) {
          toast.error('No se encontraron filas válidas en el CSV');
          console.error('[ImportarCSV] El parser devolvió 0 filas. Revisa la consola para ver las líneas crudas.');
          return;
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ImportarCSV] Primera fila parseada:', parsed[0]);
        }
        setFilas(parsed);
        setEtapa('preview');
      } catch (err) {
        toast.error('Error al parsear el archivo. Verifica que sea un CSV de Loyverse.');
        console.error('[ImportarCSV] Error al parsear:', err);
      }
    };
    reader.readAsText(file, 'utf-8');
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleImportar = async () => {
    if (!userData) {
      toast.error('No hay sesión activa');
      return;
    }
    setEtapa('importing');
    try {
      const result = await importarFilasCSV(filas, userData.id);
      setResumen({ importados: result.importados, omitidos: result.omitidos });
      setErroresImport(result.errores);
      setEtapa('done');
      if (result.importados > 0) {
        toast.success(`${result.importados} turno(s) importado(s) correctamente`);
      }
      if (result.omitidos > 0) {
        toast.info(`${result.omitidos} turno(s) ya existían y fueron omitidos`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error durante la importación');
      setEtapa('preview');
    }
  };

  const handleReset = () => {
    setEtapa('idle');
    setFilas([]);
    setErroresImport([]);
    setResumen(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-5 w-5" />
          Importar CSV de Loyverse
        </CardTitle>
        <CardDescription>
          Sube el archivo de resumen de turnos exportado desde Loyverse para cargar el historial
          automáticamente. Los turnos ya existentes serán omitidos.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado idle — selector de archivo */}
        {etapa === 'idle' && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Haz clic para seleccionar el archivo CSV</p>
            <p className="text-xs text-muted-foreground mt-1">Formato: Resumen de turnos de Loyverse (.csv)</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}

        {/* Estado preview — tabla de revisión */}
        {etapa === 'preview' && filas.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {filas.length} turno(s) encontrado(s) — revisa antes de importar
              </p>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead>Fondo</TableHead>
                    <TableHead>Ventas</TableHead>
                    <TableHead>Efectivo</TableHead>
                    <TableHead>Diferencia</TableHead>
                    <TableHead>Abierto por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.slice(0, 20).map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{f.fecha}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.horaApertura.slice(0, 16)}
                      </TableCell>
                      <TableCell className="text-xs">{fmt(f.fondoInicial)}</TableCell>
                      <TableCell className="text-xs text-green-600">{fmt(f.ventasNetas)}</TableCell>
                      <TableCell className="text-xs">{fmt(f.pagosEfectivo)}</TableCell>
                      <TableCell className={`text-xs font-semibold ${f.diferencia < 0 ? 'text-destructive' : f.diferencia > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                        {f.diferencia > 0 ? '+' : ''}{fmt(f.diferencia)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {f.abiertoPor}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filas.length > 20 && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando 20 de {filas.length} turnos
              </p>
            )}

            <Button className="w-full" onClick={handleImportar}>
              Importar {filas.length} turno(s)
            </Button>
          </>
        )}

        {/* Estado importing */}
        {etapa === 'importing' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando turnos… por favor espera</p>
          </div>
        )}

        {/* Estado done */}
        {etapa === 'done' && resumen && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold text-sm">Importación completada</p>
            </div>
            <div className="flex gap-3">
              <Badge variant="default">{resumen.importados} importado(s)</Badge>
              {resumen.omitidos > 0 && (
                <Badge variant="secondary">{resumen.omitidos} omitido(s)</Badge>
              )}
            </div>
            {erroresImport.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {erroresImport.length} error(es) durante la importación:
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5 pl-4 list-disc">
                  {erroresImport.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              Importar otro archivo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
