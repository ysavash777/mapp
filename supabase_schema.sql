-- ═══════════════════════════════════════════════
--  GDSMapiX · Supabase Schema
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════

-- ── Proyectos ────────────────────────────────────
create table if not exists projects (
  id          text        primary key,
  name        text        not null,
  created_by  text        not null default 'Sistema',
  created_at  timestamptz not null default now()
);

-- ── Entries (registros de escaneo) ───────────────
create table if not exists entries (
  id          text        primary key,
  project_id  text        not null references projects(id) on delete cascade,
  ref         text,
  dun         text,
  desc        text,
  tipo        text        not null,
  subtipo     text,
  fecha_venc  text,
  comentario  text,
  qty         integer     not null default 1,
  "user"      text,
  ts          timestamptz not null default now()
);

-- Índice para acelerar queries por proyecto
create index if not exists entries_project_id_idx on entries(project_id);

-- ── Row Level Security (RLS) ─────────────────────
-- La app es de uso interno sin auth de usuarios,
-- así que permitimos todo con la anon key.
alter table projects enable row level security;
alter table entries  enable row level security;

create policy "public_projects" on projects for all using (true) with check (true);
create policy "public_entries"  on entries  for all using (true) with check (true);

-- ── Realtime ─────────────────────────────────────
-- Habilitar Realtime sobre la tabla entries para
-- que los cambios de un usuario lleguen en vivo
-- a todos los demás sin recargar la página.
alter publication supabase_realtime add table entries;
alter publication supabase_realtime add table projects;
