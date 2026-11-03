-- Si ya creaste la tabla 'comics' antes, ejecuta esta línea para añadir la columna 'publisher':
alter table public.comics add column if not exists publisher text not null default 'Independiente';
