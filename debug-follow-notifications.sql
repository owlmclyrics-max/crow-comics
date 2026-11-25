-- Depurar notificaciones de seguimiento
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar todas las notificaciones de tipo 'follow'
SELECT 
  id,
  user_id,
  actor_id,
  type,
  body,
  read_at,
  created_at
FROM notifications
WHERE type = 'follow'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Verificar si hay notificaciones sin leer de follow
SELECT 
  COUNT(*) as unread_follow_count
FROM notifications
WHERE type = 'follow'
AND read_at IS NULL;

-- 3. Verificar políticas RLS de notifications
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'notifications';
