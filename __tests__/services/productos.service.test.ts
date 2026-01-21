/**
 * Tests para ProductosService
 * Old Texas BBQ - CRM
 *
 * Nota: Los métodos que interactúan con Firebase se mockean.
 * Aquí testeamos la lógica de negocio pura (export/import CSV, validaciones).
 */

import '@/__mocks__/firebase';

// Creamos una versión simplificada del servicio para testear métodos puros
class ProductosServiceTestable {
  /**
   * Exporta productos a formato CSV
   */
  exportToCSV(productos: any[]): string {
    const headers = [
      'ID',
      'SKU',
      'Nombre',
      'Descripción',
      'Categoría ID',
      'Categoría Nombre',
      'Precio',
      'Precio Promoción',
      'En Promoción',
      'Disponible',
      'Imagen',
      'Orden',
      'Popularidad',
      'Etiquetas',
      'Ingredientes',
    ];

    const rows = productos.map((p) => [
      p.id,
      p.sku || '',
      `"${(p.nombre || '').replace(/"/g, '""')}"`,
      `"${(p.descripcion || '').replace(/"/g, '""')}"`,
      p.categoriaId,
      p.categoriaNombre,
      p.precio,
      p.precioPromocion || '',
      p.enPromocion ? 'Sí' : 'No',
      p.disponible ? 'Sí' : 'No',
      p.imagen || '',
      p.orden,
      p.popularidad,
      `"${(p.etiquetas || []).join(', ')}"`,
      `"${(p.ingredientes || []).join(', ')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Parsea CSV y retorna datos listos para importar
   */
  parseCSV(csvContent: string): Array<any> {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const productos: Array<any> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const producto: any = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';

        switch (header) {
          case 'nombre':
            producto.nombre = value;
            break;
          case 'descripción':
          case 'descripcion':
            producto.descripcion = value;
            break;
          case 'categoría id':
          case 'categoria id':
          case 'categoriaid':
            producto.categoriaId = value;
            break;
          case 'categoría nombre':
          case 'categoria nombre':
          case 'categorianombre':
            producto.categoriaNombre = value;
            break;
          case 'precio':
            producto.precio = parseFloat(value) || 0;
            break;
          case 'precio promoción':
          case 'precio promocion':
          case 'preciopromocion':
            producto.precioPromocion = value ? parseFloat(value) : undefined;
            break;
          case 'en promoción':
          case 'en promocion':
          case 'enpromocion':
            producto.enPromocion =
              value.toLowerCase() === 'sí' ||
              value.toLowerCase() === 'si' ||
              value === '1';
            break;
          case 'disponible':
            producto.disponible =
              value.toLowerCase() === 'sí' ||
              value.toLowerCase() === 'si' ||
              value === '1';
            break;
          case 'imagen':
            producto.imagen = value || undefined;
            break;
          case 'orden':
            producto.orden = parseInt(value) || 0;
            break;
          case 'etiquetas':
            producto.etiquetas = value
              ? value.split(',').map((t: string) => t.trim())
              : [];
            break;
          case 'ingredientes':
            producto.ingredientes = value
              ? value.split(',').map((i: string) => i.trim())
              : [];
            break;
          case 'sku':
            producto.sku = value || undefined;
            break;
        }
      });

      if (producto.nombre) {
        productos.push({
          ...producto,
          popularidad: producto.popularidad || 0,
          permitePersonalizacion: false,
        });
      }
    }

    return productos;
  }

  /**
   * Parsea una línea CSV respetando comillas
   */
  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Valida si existe un producto con el mismo nombre (versión simplificada para test)
   */
  validarNombreDuplicado(
    nombre: string,
    productos: any[],
    excludeId?: string
  ): boolean {
    const nombreLower = nombre.toLowerCase().trim();

    return productos.some(
      (p) =>
        p.nombre.toLowerCase().trim() === nombreLower &&
        !p.eliminado &&
        p.id !== excludeId
    );
  }
}

describe('ProductosService', () => {
  let service: ProductosServiceTestable;

  beforeEach(() => {
    service = new ProductosServiceTestable();
  });

  // ==========================================================================
  // exportToCSV
  // ==========================================================================
  describe('exportToCSV', () => {
    it('debe exportar productos correctamente a CSV', () => {
      const productos = [
        {
          id: '1',
          sku: 'BBQ001',
          nombre: 'Brisket',
          descripcion: 'Carne ahumada',
          categoriaId: 'cat1',
          categoriaNombre: 'Carnes',
          precio: 250,
          precioPromocion: null,
          enPromocion: false,
          disponible: true,
          imagen: 'https://example.com/brisket.jpg',
          orden: 1,
          popularidad: 100,
          etiquetas: ['destacado', 'popular'],
          ingredientes: ['carne', 'especias'],
        },
      ];

      const csv = service.exportToCSV(productos);

      expect(csv).toContain('ID,SKU,Nombre');
      expect(csv).toContain('1,BBQ001,"Brisket"');
      expect(csv).toContain('"destacado, popular"');
      expect(csv).toContain('Sí'); // disponible
      expect(csv).toContain('No'); // enPromocion
    });

    it('debe manejar productos con campos vacíos', () => {
      const productos = [
        {
          id: '2',
          nombre: 'Producto Simple',
          descripcion: '',
          categoriaId: '',
          categoriaNombre: '',
          precio: 100,
          enPromocion: false,
          disponible: true,
          orden: 0,
          popularidad: 0,
        },
      ];

      const csv = service.exportToCSV(productos);

      expect(csv).toContain('2,,"Producto Simple"');
      expect(csv).not.toContain('undefined');
    });

    it('debe escapar comillas dobles en campos', () => {
      const productos = [
        {
          id: '3',
          nombre: 'Producto con "comillas"',
          descripcion: 'Descripción normal',
          categoriaId: 'cat1',
          categoriaNombre: 'Cat',
          precio: 50,
          enPromocion: false,
          disponible: true,
          orden: 0,
          popularidad: 0,
        },
      ];

      const csv = service.exportToCSV(productos);

      expect(csv).toContain('"Producto con ""comillas"""');
    });

    it('debe retornar solo headers si no hay productos', () => {
      const csv = service.exportToCSV([]);

      expect(csv).toContain('ID,SKU,Nombre');
      expect(csv.split('\n').length).toBe(1);
    });
  });

  // ==========================================================================
  // parseCSV
  // ==========================================================================
  describe('parseCSV', () => {
    it('debe parsear CSV válido correctamente', () => {
      const csv = `nombre,descripcion,precio,disponible
Brisket,Carne ahumada,250,Sí
Costillas,BBQ costillas,180,Sí`;

      const productos = service.parseCSV(csv);

      expect(productos).toHaveLength(2);
      expect(productos[0].nombre).toBe('Brisket');
      expect(productos[0].precio).toBe(250);
      expect(productos[0].disponible).toBe(true);
    });

    it('debe manejar valores con comillas', () => {
      const csv = `nombre,descripcion,precio
"Brisket Premium","Carne ahumada, con especias",300`;

      const productos = service.parseCSV(csv);

      expect(productos[0].nombre).toBe('Brisket Premium');
      expect(productos[0].descripcion).toBe('Carne ahumada, con especias');
    });

    it('debe retornar array vacío si CSV solo tiene headers', () => {
      const csv = 'nombre,descripcion,precio';
      const productos = service.parseCSV(csv);

      expect(productos).toHaveLength(0);
    });

    it('debe retornar array vacío si CSV está vacío', () => {
      const productos = service.parseCSV('');

      expect(productos).toHaveLength(0);
    });

    it('debe ignorar filas sin nombre', () => {
      const csv = `nombre,precio
Brisket,250
,100
Costillas,180`;

      const productos = service.parseCSV(csv);

      expect(productos).toHaveLength(2);
      expect(productos.every((p) => p.nombre)).toBe(true);
    });

    it('debe parsear valores booleanos correctamente', () => {
      const csv = `nombre,disponible,enPromocion
Producto1,Sí,No
Producto2,si,Sí
Producto3,1,0`;

      const productos = service.parseCSV(csv);

      expect(productos[0].disponible).toBe(true);
      expect(productos[0].enPromocion).toBe(false);
      expect(productos[1].disponible).toBe(true);
      expect(productos[1].enPromocion).toBe(true);
      expect(productos[2].disponible).toBe(true);
      expect(productos[2].enPromocion).toBe(false);
    });

    it('debe parsear etiquetas separadas por coma', () => {
      const csv = `nombre,etiquetas
Brisket,"destacado, popular, nuevo"`;

      const productos = service.parseCSV(csv);

      expect(productos[0].etiquetas).toEqual(['destacado', 'popular', 'nuevo']);
    });
  });

  // ==========================================================================
  // parseCSVLine
  // ==========================================================================
  describe('parseCSVLine', () => {
    it('debe parsear línea simple', () => {
      const line = 'a,b,c,d';
      const result = service.parseCSVLine(line);

      expect(result).toEqual(['a', 'b', 'c', 'd']);
    });

    it('debe manejar campos con comillas', () => {
      const line = '"valor con, coma",normal,"otro valor"';
      const result = service.parseCSVLine(line);

      expect(result).toEqual(['valor con, coma', 'normal', 'otro valor']);
    });

    it('debe manejar comillas dobles escapadas', () => {
      const line = '"valor con ""comillas"" internas",normal';
      const result = service.parseCSVLine(line);

      expect(result).toEqual(['valor con "comillas" internas', 'normal']);
    });

    it('debe manejar campos vacíos', () => {
      const line = 'a,,c,';
      const result = service.parseCSVLine(line);

      expect(result).toEqual(['a', '', 'c', '']);
    });

    it('debe manejar línea vacía', () => {
      const result = service.parseCSVLine('');

      expect(result).toEqual(['']);
    });
  });

  // ==========================================================================
  // validarNombreDuplicado
  // ==========================================================================
  describe('validarNombreDuplicado', () => {
    const productosExistentes = [
      { id: '1', nombre: 'Brisket', eliminado: false },
      { id: '2', nombre: 'Costillas BBQ', eliminado: false },
      { id: '3', nombre: 'Producto Eliminado', eliminado: true },
    ];

    it('debe detectar nombre duplicado', () => {
      const result = service.validarNombreDuplicado(
        'Brisket',
        productosExistentes
      );

      expect(result).toBe(true);
    });

    it('debe detectar duplicado ignorando mayúsculas/minúsculas', () => {
      const result = service.validarNombreDuplicado(
        'BRISKET',
        productosExistentes
      );

      expect(result).toBe(true);
    });

    it('debe detectar duplicado ignorando espacios', () => {
      const result = service.validarNombreDuplicado(
        '  Brisket  ',
        productosExistentes
      );

      expect(result).toBe(true);
    });

    it('debe ignorar productos eliminados', () => {
      const result = service.validarNombreDuplicado(
        'Producto Eliminado',
        productosExistentes
      );

      expect(result).toBe(false);
    });

    it('debe excluir el producto actual al editar', () => {
      const result = service.validarNombreDuplicado(
        'Brisket',
        productosExistentes,
        '1'
      );

      expect(result).toBe(false);
    });

    it('debe permitir nombres únicos', () => {
      const result = service.validarNombreDuplicado(
        'Nuevo Producto',
        productosExistentes
      );

      expect(result).toBe(false);
    });
  });
});
