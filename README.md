# GDSMapiX · Setup Guide

## 1. Supabase — Crear base de datos

1. Crear cuenta en https://supabase.com y crear un nuevo proyecto
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase_schema.sql`
3. Ir a **Storage → New bucket**:
   - Nombre: `catalogs`
   - Public: **NO** (privado, acceso via anon key)
4. Ir a **Settings → API** y copiar:
   - `Project URL`
   - `anon public key`

## 2. Configurar credenciales

Editar `public/js/core/supabase.js`:

```js
const SUPABASE_URL  = 'https://TU_PROJECT_ID.supabase.co';  // ← tu URL
const SUPABASE_ANON = 'TU_ANON_PUBLIC_KEY';                 // ← tu anon key
```

## 3. Subir catálogos iniciales

Antes del primer deploy, subir `variables.xlsx` y `referencia.xlsx` a la
carpeta `public/` del repo (sirven como fallback estático si Supabase Storage
no tiene versión más nueva).

También podés subirlos desde la app una vez deployada:
Pantalla de proyectos → ⚙️ → Catálogos del sistema

## 4. Render — Deploy

1. Crear cuenta en https://render.com
2. **New → Static Site**
3. Conectar el repositorio de GitHub con este código
4. Configuración:
   - **Publish directory**: `public`
   - **Build command**: (dejar vacío)
5. Click en **Deploy**

La URL que te da Render es la que comparten los 5 usuarios.

## 5. Supabase Realtime — Verificar

En Supabase Dashboard → **Realtime** verificar que las tablas
`entries` y `projects` aparezcan habilitadas. Si no aparecen,
volver a correr el SQL del schema.

## Estructura del proyecto

```
mapix_static/
├── render.yaml               ← config de Render
├── supabase_schema.sql       ← correr en Supabase SQL Editor
├── README.md
└── public/
    ├── index.html
    ├── _redirects
    ├── variables.xlsx        ← agregar antes del deploy
    ├── referencia.xlsx       ← agregar antes del deploy
    ├── css/
    │   └── app.css
    └── js/
        ├── app.js
        ├── core/
        │   ├── supabase.js   ← EDITAR con tus credenciales
        │   ├── state.js
        │   ├── utils.js
        │   ├── toast.js
        │   └── confirm-dialog.js
        └── modules/
            ├── audio.js
            ├── back-guard.js
            ├── catalog-settings.js
            ├── entries-list.js
            ├── entry-sheet.js
            ├── export.js
            ├── filter-search.js
            ├── keyboard-aware.js
            ├── manual-input.js
            ├── persistence.js
            ├── product-lookup.js
            ├── projects.js
            ├── realtime.js
            ├── scanner.js
            ├── settings.js
            ├── setup.js
            ├── stock-prefix-config.js
            └── users.js
```
