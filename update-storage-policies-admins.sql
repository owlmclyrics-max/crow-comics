-- ==============================================================================
-- CROW COMICS: políticas del bucket "pages" leídas de app_admins
-- ==============================================================================
-- Ejecutar DESPUÉS de add-admins-table.sql en el SQL Editor.
-- Reemplaza los emails hardcodeados de setup-storage-pages.sql por la tabla
-- app_admins: de ahora en más, agregar/quitar un admin en la web basta.
-- ==============================================================================

drop policy if exists "pages suben admins" on storage.objects;
create policy "pages suben admins"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pages'
  and exists (
    select 1 from public.app_admins
    where email = lower(auth.email())
      and role in ('owner', 'admin', 'colaborador')
  )
);

drop policy if exists "pages borran admins" on storage.objects;
create policy "pages borran admins"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'pages'
  and exists (
    select 1 from public.app_admins
    where email = lower(auth.email())
      and role in ('owner', 'admin', 'colaborador')
  )
);
