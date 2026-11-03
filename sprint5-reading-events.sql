-- ==============================================================================
-- CROW COMICS - SPRINT 5: GUÍAS DE LECTURA Y EVENTOS (CROSSOVERS)
-- Dos tablas nuevas:
--   events       → cabecera de cada saga / evento (crossover)
--   event_items  → orden de lectura paso a paso de ese evento
-- El RLS permite lectura pública para ambas (visitantes incluidos); la
-- edición queda reservada para cuentas autenticadas (igual que el catálogo).
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ==============================================================================

-- 1. Tabla de eventos (saga / crossover)
create table if not exists public.events (
    id          uuid primary key default gen_random_uuid(),
    title       text not null,
    description text,
    publisher   text,
    cover_url   text,               -- imagen panorámica del evento (se recorta con aspect-video)
    year        integer,
    is_complete boolean default false not null, -- ¿ya se publicaron todos los números de la saga?
    created_at  timestamptz default now() not null
);

-- 2. Tabla de items del evento (el orden de lectura)
--    comic_id es NULLABLE: permite listar números que aún no están maquetados
--    en el catálogo (se muestran con candado y "Próximamente").
create table if not exists public.event_items (
    id           uuid primary key default gen_random_uuid(),
    event_id     uuid references public.events (id) on delete cascade not null,
    comic_id     uuid references public.comics (id) on delete set null,
    position     integer not null default 1,   -- orden de lectura (1, 2, 3...)
    is_essential boolean default true not null,
    is_optional  boolean default false not null,
    title        text,                          -- etiqueta propia del número (ej. "Wonder Woman #12"); opcional
    created_at   timestamptz default now() not null
);

-- 3. RLS activado en ambas tablas
alter table public.events enable row level security;
alter table public.event_items enable row level security;

-- 4. Limpieza de políticas previas de este sprint (idempotencia)
drop policy if exists "Eventos son públicos para lectura" on public.events;
drop policy if exists "Solo usuarios autenticados pueden crear eventos" on public.events;
drop policy if exists "Solo usuarios autenticados pueden editar eventos" on public.events;
drop policy if exists "Solo usuarios autenticados pueden eliminar eventos" on public.events;
drop policy if exists "Items de eventos son públicos para lectura" on public.event_items;
drop policy if exists "Solo usuarios autenticados pueden crear items de eventos" on public.event_items;
drop policy if exists "Solo usuarios autenticados pueden editar items de eventos" on public.event_items;
drop policy if exists "Solo usuarios autenticados pueden eliminar items de eventos" on public.event_items;

-- 5. Lectura pública (anon + authenticated) para el catálogo de guías
create policy "Eventos son públicos para lectura"
on public.events for select
to anon, authenticated
using (true);

create policy "Items de eventos son públicos para lectura"
on public.event_items for select
to anon, authenticated
using (true);

-- 6. Escritura reservada para el equipo Crow (admins). Requiere la función
--    is_crow_admin() del script hardening-admin-rls.sql (ejecutarlo primero).
create policy "Solo el equipo Crow crea guías"
on public.events for insert
to authenticated
with check (public.is_crow_admin());

create policy "Solo el equipo Crow edita guías"
on public.events for update
to authenticated
using (public.is_crow_admin())
with check (public.is_crow_admin());

create policy "Solo el equipo Crow elimina guías"
on public.events for delete
to authenticated
using (public.is_crow_admin());

create policy "Solo el equipo Crow crea items de guías"
on public.event_items for insert
to authenticated
with check (public.is_crow_admin());

create policy "Solo el equipo Crow edita items de guías"
on public.event_items for update
to authenticated
using (public.is_crow_admin())
with check (public.is_crow_admin());

create policy "Solo el equipo Crow elimina items de guías"
on public.event_items for delete
to authenticated
using (public.is_crow_admin());

-- 7. Índices para las consultas del catálogo y del detalle
create index if not exists idx_event_items_event_position
    on public.event_items (event_id, position asc);
create index if not exists idx_event_items_comic
    on public.event_items (comic_id);

-- 8. (Opcional) Ejemplo de evento listo para personalizar ---------------------------------
-- insert into public.events (title, description, publisher, year, is_complete)
-- values (
--     'Guía de Lectura: Saga Infinita',
--     'El orden correcto para leer el cruce completo entre series, paso a paso.',
--     'Marvel', 2026, true
-- );
-- insert into public.event_items (event_id, comic_id, position, is_essential, is_optional, title)
-- values
--     ((select id from public.events where title = 'Guía de Lectura: Saga Infinita'), null, 1, true,  false, 'Prólogo #1'),
--     ((select id from public.events where title = 'Guía de Lectura: Saga Infinita'), null, 2, true,  false, 'Acto #1'),
--     ((select id from public.events where title = 'Guía de Lectura: Saga Infinita'), null, 3, false, true,  'Interludio (opcional)');
