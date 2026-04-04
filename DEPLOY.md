# Guía de Deploy — Adelantos Enviopack

## Arquitectura
- **Frontend**: Vercel (ya deployado en https://adelantos-app.vercel.app)
- **API**: Railway (Symfony 6.4 + PHP 8.2)
- **Base de datos**: Railway PostgreSQL plugin

---

## Paso 1 — Subir el código a GitHub

```bash
cd "/Users/enviopack/Downloads/Nueva plataforma de adelantos"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_ORG/adelantos-api.git
git push -u origin main
```

---

## Paso 2 — Crear proyecto en Railway

1. Ir a https://railway.app → **New Project**
2. Elegir **Deploy from GitHub repo** → seleccionar el repo
3. Railway detecta el `railway.json` y usa el Dockerfile automáticamente
4. Agregar el plugin de **PostgreSQL**: menú del proyecto → **+ New** → **Database** → **PostgreSQL**
5. Railway genera `DATABASE_URL` automáticamente — ya está disponible como variable de entorno

---

## Paso 3 — Generar claves JWT

En tu máquina local, dentro de `api/`:

```bash
# Generar claves RSA 4096-bit
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:4096
openssl pkey -in private.pem -pubout -out public.pem

# Encodear en base64 (una sola línea, sin saltos)
cat private.pem | base64 | tr -d '\n'   # → copiar como JWT_PRIVATE_KEY_BASE64
cat public.pem  | base64 | tr -d '\n'   # → copiar como JWT_PUBLIC_KEY_BASE64

# Limpiar archivos locales si no los querés guardar
rm private.pem public.pem
```

---

## Paso 4 — Configurar variables de entorno en Railway

En el panel de Railway → tu servicio → **Variables**, agregar:

| Variable | Valor |
|---|---|
| `APP_ENV` | `prod` |
| `APP_DEBUG` | `0` |
| `APP_SECRET` | `openssl rand -hex 32` |
| `DATABASE_URL` | (ya injected por el plugin de Postgres) |
| `JWT_SECRET_KEY` | `%kernel.project_dir%/config/jwt/private.pem` |
| `JWT_PUBLIC_KEY` | `%kernel.project_dir%/config/jwt/public.pem` |
| `JWT_PASSPHRASE` | contraseña segura (ej: `openssl rand -hex 16`) |
| `JWT_PRIVATE_KEY_BASE64` | output del paso anterior |
| `JWT_PUBLIC_KEY_BASE64` | output del paso anterior |
| `CORS_ALLOW_ORIGIN` | `^https://adelantos-app\.vercel\.app$` |
| `APP_FRONTEND_URL` | `https://adelantos-app.vercel.app` |

> El resto de variables (MAILER_DSN, AWS, etc.) se pueden agregar después.

---

## Paso 5 — Primer deploy

Railway hace el build automáticamente al conectar el repo.
Verificar en **Deployments** que el build pase y el health check responda:

```bash
curl https://TU-APP.railway.app/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## Paso 6 — Cargar datos iniciales (fixtures)

```bash
# Conectarse a Railway CLI
npm install -g @railway/cli
railway login
railway link   # seleccionar el proyecto

# Correr fixtures (crea admin, configuración base)
railway run php bin/console doctrine:fixtures:load --no-interaction
```

---

## Paso 7 — Conectar el frontend

En **Vercel** → tu proyecto → **Settings** → **Environment Variables**:

| Variable | Valor |
|---|---|
| `APP_API_URL` | `https://TU-APP.railway.app` |

Luego hacer **Redeploy** del frontend en Vercel.

> Una vez configurada esta variable, el frontend deja de usar datos de demo y se conecta a la API real.

---

## Paso 8 — Importar choferes existentes

Con la API corriendo, usar el endpoint de importación masiva:

```bash
curl -X POST https://TU-APP.railway.app/api/admin/choferes/importar \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "choferes": [
      {
        "nombre": "Juan",
        "apellido": "Pérez",
        "email": "juan@example.com",
        "dni": "12345678",
        "cuil": "20-12345678-9"
      }
    ]
  }'
```

O preparar un script con todos los choferes del CSV.

---

## Dominios custom (opcional)

- Railway → Settings → **Custom Domain**: agregar `api.adelantos.enviopack.com`
- Actualizar `APP_API_URL` en Vercel y `CORS_ALLOW_ORIGIN` en Railway

---

## Checklist final

- [ ] `curl /api/health` responde 200
- [ ] Login con admin@enviopack.com funciona desde Vercel
- [ ] CORS no da error en el browser
- [ ] Migrations corridas (ver logs de Railway)
- [ ] Fixtures cargados o admin creado manualmente
