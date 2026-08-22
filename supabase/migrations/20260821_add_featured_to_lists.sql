-- Agrega columna featured a la tabla lists
-- Permite que el dueño de una lista la marque como destacada en su perfil.
alter table lists add column if not exists featured boolean not null default false;
