-- Bots de prueba para el matchmaking. No pueden iniciar sesión: password_hash null
insert into public.users (email, username, password_hash, display_name, elo_rating)
values ('bot_ana@bots.local',  'bot_ana',  null, 'Ana (bot)',  1420),
       ('bot_luis@bots.local', 'bot_luis', null, 'Luis (bot)', 1510),
       ('bot_sara@bots.local', 'bot_sara', null, 'Sara (bot)', 1260)
on conflict do nothing;
