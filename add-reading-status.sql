-- ============================================================
-- v0.6 — ESTADOS DE LECTURA POR TOMO
-- Ejecutar en Supabase → SQL Editor (una sola vez).
--
-- Añade la columna reading_status a reading_progress.
-- Valores: 'leyendo' | 'leido' | 'en_pausa' | 'abandonado'
-- NULL = filas antiguas (el usuario todavía no eligió estado).
--
-- RLS no cambia: la tabla sigue protegida por las mismas
-- políticas (cada usuario solo ve/escribe sus filas).
-- ============================================================

alter table public.reading_progress
  add column if not exists reading_status text;

-- Solo acepta los 4 estados válidos (o vacío).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reading_progress_status_check'
  ) then
    alter table public.reading_progress
      add constraint reading_progress_status_check
      check (reading_status is null
             or reading_status in ('leyendo', 'leido', 'en_pausa', 'abandonado'));
  end if;
end $$;

comment on column public.reading_progress.reading_status is
  'Estado del tomo elegido por el lector (v0.6): leyendo | leido | en_pausa | abandonado. NULL = sin estado asignado.';
