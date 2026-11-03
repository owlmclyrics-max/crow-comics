-- ============================================================
-- CROW COMICS: Tabla de reportes de enlaces caídos
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

create table if not exists public.link_reports (
    id uuid default gen_random_uuid() primary key,
    chapter_id   uuid references public.chapters(id) on delete cascade not null,
    comic_title  text not null,
    chapter_title text not null,
    link_name    text not null,
    link_url     text not null,
    reporter_name text,
    message      text,
    status       text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
    created_at   timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.link_reports enable row level security;

-- Lectura pública solo para admins autenticados
create policy "Solo admins pueden ver reportes"
on public.link_reports for select
to authenticated
using (true);

-- Cualquier visitante puede insertar un reporte
create policy "Visitantes pueden reportar enlaces"
on public.link_reports for insert
to anon, authenticated
with check (true);

-- Solo admins pueden actualizar el estado
create policy "Solo admins pueden actualizar reportes"
on public.link_reports for update
to authenticated
using (true)
with check (true);

-- Solo admins pueden eliminar reportes
create policy "Solo admins pueden eliminar reportes"
on public.link_reports for delete
to authenticated
using (true);
