/**
 * ImportExportModal Component
 * Old Texas BBQ - CRM
 *
 * Modal para importar y exportar productos en formato CSV
 */

'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { productosService } from '@/lib/services/productos.service';
import { Producto } from '@/lib/types/firestore';
import { toast } from 'sonner';

interface ImportExportModalProps {
  open: boolean;
  onClose: () => void;
  productos: Producto[];
  usuarioId: string;
}

export function ImportExportModal({
  open,
  onClose,
  productos,
  usuarioId,
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    exitosos: number;
    errores: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // EXPORT
  // ============================================================

  const handleExport = () => {
    try {
      const csvContent = productosService.exportToCSV(productos);
      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${productos.length} productos exportados correctamente`);
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error('Error al exportar productos');
    }
  };

  const handleExportTemplate = () => {
    const template = [
      'Nombre,Descripción,Categoría ID,Categoría Nombre,Precio,Precio Promoción,En Promoción,Disponible,Imagen,Orden,Etiquetas,Ingredientes,SKU',
      '"Producto Ejemplo","Descripción del producto",categoria-id,"Categoría",99.99,,No,Sí,,0,"etiqueta1, etiqueta2","ingrediente1, ingrediente2",SKU-001',
    ].join('\n');

    const blob = new Blob(['\uFEFF' + template], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_productos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Plantilla descargada');
  };

  // ============================================================
  // IMPORT
  // ============================================================

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo CSV');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const content = await file.text();
      const result = await productosService.importFromCSV(content, usuarioId);

      setImportResult(result);

      if (result.exitosos > 0) {
        toast.success(`${result.exitosos} productos importados correctamente`);
      }

      if (result.errores.length > 0) {
        toast.warning(`${result.errores.length} productos con errores`);
      }
    } catch (error: any) {
      console.error('Error importando:', error);
      toast.error('Error al importar productos');
      setImportResult({
        exitosos: 0,
        errores: [error.message || 'Error desconocido'],
      });
    } finally {
      setImporting(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setImportResult(null);
    setActiveTab('export');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar / Exportar Productos</DialogTitle>
          <DialogDescription>
            Exporta tus productos a CSV o importa nuevos desde un archivo
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar
            </TabsTrigger>
          </TabsList>

          {/* TAB: EXPORTAR */}
          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Exportar a CSV</p>
                  <p className="text-sm text-muted-foreground">
                    {productos.length} productos disponibles
                  </p>
                </div>
              </div>

              <Button onClick={handleExport} className="w-full gap-2">
                <Download className="h-4 w-4" />
                Descargar CSV
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>El archivo incluirá todos los campos de los productos</p>
            </div>
          </TabsContent>

          {/* TAB: IMPORTAR */}
          <TabsContent value="import" className="space-y-4 mt-4">
            {/* Input de archivo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Área de carga */}
            <div
              onClick={() => !importing && fileInputRef.current?.click()}
              className={`
                rounded-lg border-2 border-dashed p-8 text-center cursor-pointer
                transition-colors hover:border-primary hover:bg-muted/50
                ${importing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {importing ? (
                <div className="space-y-2">
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                  <p className="font-medium">Importando productos...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="font-medium">Seleccionar archivo CSV</p>
                  <p className="text-sm text-muted-foreground">
                    Haz clic o arrastra un archivo aquí
                  </p>
                </div>
              )}
            </div>

            {/* Resultado de importación */}
            {importResult && (
              <div className="space-y-3">
                {importResult.exitosos > 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>Importación exitosa</AlertTitle>
                    <AlertDescription>
                      {importResult.exitosos} productos importados correctamente
                    </AlertDescription>
                  </Alert>
                )}

                {importResult.errores.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>
                      {importResult.errores.length} errores encontrados
                    </AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2 text-sm max-h-32 overflow-y-auto">
                        {importResult.errores.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Descargar plantilla */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTemplate}
                className="w-full gap-2"
              >
                <FileText className="h-4 w-4" />
                Descargar plantilla CSV
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Usa la plantilla como guía para el formato correcto
              </p>
            </div>

            {/* Instrucciones */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Importante</AlertTitle>
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>El archivo debe estar en formato CSV (UTF-8)</li>
                  <li>La primera fila debe contener los encabezados</li>
                  <li>Campos obligatorios: Nombre, Categoría ID</li>
                  <li>Productos duplicados serán ignorados</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
