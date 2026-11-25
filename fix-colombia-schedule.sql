-- ==============================================================================
-- CROW COMICS: FIX COLOMBIA TIMEZONE (GMT-5) FOR SCHEDULED CHAPTERS
-- ==============================================================================
-- Run this ONCE in the Supabase SQL Editor, before scheduling new chapters
-- with the updated app.
--
-- Why: the old chapter editor saved the picked time (Colombia local time)
-- as if it were UTC, so 18:00 in Bogota was stored as 18:00Z (5 hours off).
-- This script:
--   1. Shifts those legacy chapter dates +5 hours to the real UTC instant.
--   2. Recreates the release_schedule rows that never got created because
--      the insert was failing (created_by was the comic id, not a user id).
-- ==============================================================================

-- 1) Shift legacy chapter schedule dates (only the ones saved before the fix).
update public.chapters
set schedule_date = schedule_date + interval '5 hours'
where schedule_date is not null
  and schedule_date < '2026-11-26T00:00:00Z';

-- 2) Create the missing calendar entries for every scheduled chapter.
insert into public.release_schedule (
  comic_id,
  chapter_id,
  title,
  chapter_label,
  publisher,
  cover_url,
  release_at,
  notes,
  created_by
)
select
  c.id,
  ch.id::text,
  c.title || ' - Tomo #' || ch.chapter_number,
  '#' || ch.chapter_number || case
    when coalesce(ch.title, '') <> '' then ' - ' || ch.title
    else ''
  end,
  c.publisher,
  coalesce(ch.cover_url, c.cover_url),
  ch.schedule_date,
  null,
  null
from public.chapters ch
join public.comics c on c.id = ch.comic_id
where ch.schedule_date is not null
  and not exists (
    select 1
    from public.release_schedule r
    where r.chapter_id = ch.id::text
  );

-- Show the result.
select r.release_at, r.title, r.chapter_label
from public.release_schedule r
order by r.release_at asc;
