# Iconos y Favicons

Este directorio contiene los iconos SVG base. Para generar los PNG necesarios para producción, sigue estos pasos:

## Archivos SVG Base

- `favicon.svg` - Favicon principal (512x512)
- `icon-192.svg` - Icono para PWA (192x192)
- `apple-touch-icon.svg` - Icono para iOS (180x180)
- `og-image.svg` - Imagen para Open Graph/redes sociales (1200x630)

## Generar PNGs

### Opcion 1: Usando ImageMagick (CLI)

```bash
# Instalar ImageMagick
brew install imagemagick  # macOS
sudo apt install imagemagick  # Ubuntu

# Generar iconos
convert favicon.svg -resize 16x16 favicon-16.png
convert favicon.svg -resize 32x32 favicon-32.png
convert icon-192.svg -resize 192x192 icon-192.png
convert icon-192.svg -resize 512x512 icon-512.png
convert apple-touch-icon.svg -resize 180x180 apple-touch-icon.png
convert og-image.svg -resize 1200x630 og-image.png

# Generar favicon.ico (multi-resolución)
convert favicon.svg -resize 16x16 favicon-16.png
convert favicon.svg -resize 32x32 favicon-32.png
convert favicon.svg -resize 48x48 favicon-48.png
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico
```

### Opcion 2: Usando sharp (Node.js)

```javascript
const sharp = require('sharp');

// Generar todos los iconos
async function generateIcons() {
  // icon-192.png
  await sharp('icon-192.svg')
    .resize(192, 192)
    .png()
    .toFile('icon-192.png');

  // icon-512.png
  await sharp('favicon.svg')
    .resize(512, 512)
    .png()
    .toFile('icon-512.png');

  // apple-touch-icon.png
  await sharp('apple-touch-icon.svg')
    .resize(180, 180)
    .png()
    .toFile('apple-touch-icon.png');

  // og-image.png
  await sharp('og-image.svg')
    .resize(1200, 630)
    .png()
    .toFile('og-image.png');

  console.log('Iconos generados!');
}

generateIcons();
```

### Opcion 3: Herramientas Online

1. **RealFaviconGenerator** - https://realfavicongenerator.net/
   - Sube `favicon.svg`
   - Genera todos los tamaños automáticamente
   - Descarga el paquete completo

2. **Favicon.io** - https://favicon.io/favicon-converter/
   - Convierte SVG a múltiples formatos

3. **CloudConvert** - https://cloudconvert.com/svg-to-png
   - Conversión batch de SVG a PNG

## Archivos Requeridos para Producción

```
public/
├── favicon.ico          # Multi-resolución (16, 32, 48)
├── favicon.svg          # Para navegadores modernos
├── icon-192.png         # PWA icon
├── icon-512.png         # PWA icon grande
├── icon-maskable-192.png  # PWA maskable (con padding)
├── icon-maskable-512.png  # PWA maskable grande
├── apple-touch-icon.png # iOS
├── og-image.png         # Open Graph
└── og-pedir.png         # Open Graph para /pedir
```

## Iconos Maskable (PWA)

Los iconos maskable necesitan un área segura del 80% en el centro.
Para crear versiones maskable, agrega padding extra al diseño.

## Colores del Proyecto

- **Primario (Navy)**: #1a365d
- **Secundario (Gold)**: #d69e2e
- **Fondo oscuro**: #0f172a
- **Texto claro**: #ffffff
- **Texto muted**: #94a3b8

## Checklist Pre-Deployment

- [ ] favicon.ico generado (16, 32, 48px)
- [ ] icon-192.png generado
- [ ] icon-512.png generado
- [ ] apple-touch-icon.png generado
- [ ] og-image.png generado
- [ ] Verificar manifest.json apunta a iconos correctos
- [ ] Probar PWA installation en móvil
