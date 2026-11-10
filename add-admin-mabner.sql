-- ==============================================================================
-- CROW COMICS: AGREGAR ADMIN mabner112@gmail.com
-- ==============================================================================

-- Actualizar la función is_crow_admin para incluir el nuevo admin
create or replace function public.is_crow_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and lower(email) in (
        'owlmclyrics@gmail.com',
        'mabner112@gmail.com'
      )
  );
$$;

-- Verificación
SELECT 'Función is_crow_admin actualizada con nuevo admin' AS mensaje;
SELECT 'Admins: owlmclyrics@gmail.com, mabner112@gmail.com' AS admin_emails;
