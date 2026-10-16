-- Preferencias del perfil (tema, acento, pieza…). Su forma la valida Zod en la API; aquí solo se exige un objeto.
-- '{}' = nada guardado: la API responde con los valores por defecto.
alter table public.users
  add column preferences jsonb not null default '{}'::jsonb,
  add constraint users_preferences_is_object check (jsonb_typeof(preferences) = 'object');
