# Guía de Deployment - Old Texas BBQ CRM

## Plataformas Recomendadas

### Vercel (Recomendado)

Vercel es la plataforma oficial de Next.js y ofrece:

- HTTPS automático con Let's Encrypt
- CDN global
- Deployments automáticos desde GitHub
- SSL/TLS incluido sin configuración

#### Pasos para Deploy en Vercel:

1. **Conectar repositorio**
   ```bash
   # Instalar Vercel CLI
   npm i -g vercel

   # Login
   vercel login

   # Deploy
   vercel
   ```

2. **Configurar variables de entorno**
   - Ir a Settings > Environment Variables
   - Agregar todas las variables de `.env.production.example`

3. **Configurar dominio personalizado**
   - Settings > Domains
   - Agregar `crm.oldtexasbbq.com`
   - Vercel configurará HTTPS automáticamente

### Firebase Hosting (Alternativa)

1. **Instalar Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Configurar proyecto**
   ```bash
   firebase init hosting
   ```

3. **Configurar `firebase.json`**
   ```json
   {
     "hosting": {
       "public": ".next",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ],
       "headers": [
         {
           "source": "**/*.@(js|css)",
           "headers": [
             {
               "key": "Cache-Control",
               "value": "public, max-age=31536000, immutable"
             }
           ]
         }
       ]
     }
   }
   ```

4. **Build y deploy**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## Configuración de HTTPS

### En Vercel (Automático)

Vercel configura HTTPS automáticamente:

- Certificado SSL/TLS gratuito de Let's Encrypt
- Renovación automática
- HTTP/2 y HTTP/3 habilitados
- HSTS configurado

### En servidor propio (VPS/Docker)

#### Opción 1: Nginx + Let's Encrypt

1. **Instalar Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtener certificado**
   ```bash
   sudo certbot --nginx -d crm.oldtexasbbq.com
   ```

3. **Configuración Nginx**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name crm.oldtexasbbq.com;

       ssl_certificate /etc/letsencrypt/live/crm.oldtexasbbq.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/crm.oldtexasbbq.com/privkey.pem;

       # Seguridad SSL
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_prefer_server_ciphers on;
       ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

       # HSTS
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

       # Proxy a Next.js
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }

   # Redirect HTTP a HTTPS
   server {
       listen 80;
       server_name crm.oldtexasbbq.com;
       return 301 https://$server_name$request_uri;
   }
   ```

#### Opción 2: Traefik (Docker)

```yaml
# docker-compose.yml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - --api.insecure=true
      - --providers.docker=true
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.email=admin@oldtexasbbq.com
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt

  app:
    build: .
    labels:
      - traefik.enable=true
      - traefik.http.routers.app.rule=Host(`crm.oldtexasbbq.com`)
      - traefik.http.routers.app.entrypoints=websecure
      - traefik.http.routers.app.tls.certresolver=letsencrypt

volumes:
  letsencrypt:
```

---

## Headers de Seguridad

Ya configurados en `next.config.ts`:

```typescript
headers: [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
]
```

### Content Security Policy (Opcional)

Agregar en `next.config.ts` si se necesita CSP estricto:

```typescript
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://res.cloudinary.com",
    "font-src 'self'",
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com",
  ].join('; ')
}
```

---

## Checklist Pre-Deployment

### Variables de Entorno
- [ ] `SESSION_SECRET` generado con `openssl rand -base64 32`
- [ ] Firebase configurado con proyecto de producción
- [ ] Cloudinary configurado
- [ ] Clip en modo production (si aplica)
- [ ] Google Analytics ID configurado
- [ ] Sentry DSN configurado (opcional)

### Seguridad
- [ ] HTTPS habilitado
- [ ] Headers de seguridad configurados
- [ ] Firestore rules revisadas
- [ ] API routes protegidas

### Rendimiento
- [ ] `npm run build` sin errores
- [ ] Bundle size aceptable (< 500KB initial)
- [ ] Imágenes optimizadas
- [ ] Caché configurado

### DNS
- [ ] Dominio apuntando al servidor/Vercel
- [ ] SSL certificado válido
- [ ] www redirect configurado (si aplica)

### Monitoreo
- [ ] Logs accesibles
- [ ] Error tracking configurado
- [ ] Alertas configuradas (opcional)

---

## Comandos Útiles

```bash
# Build de producción
npm run build

# Analizar bundle
npm run analyze

# Preview de producción local
npm run start

# Deploy a Vercel
vercel --prod

# Deploy a Firebase
firebase deploy --only hosting
```

---

## Troubleshooting

### Error: HTTPS no funciona

1. Verificar que DNS apunte correctamente
2. Esperar propagación DNS (hasta 48h)
3. Verificar certificado con `openssl s_client -connect crm.oldtexasbbq.com:443`

### Error: Mixed content

Asegurar que todas las URLs sean HTTPS:
- Cloudinary: usar `https://res.cloudinary.com`
- Firebase: usar `https://` en configuración
- APIs externas: verificar HTTPS

### Error: Cookies no funcionan

En producción, las cookies requieren:
- `Secure: true`
- `SameSite: 'lax'` o `'strict'`
- Dominio correcto

---

**Última actualización:** Febrero 2026
