-- Bots de prueba para el matchmaking. No pueden iniciar sesión: password_hash null. Va después de 0004 (is_bot)
insert into public.users (email, username, password_hash, display_name, elo_rating, is_bot)
values ('bot_ana@bots.local',  'bot_ana',  null, 'Ana (bot)',  1420, true),
       ('bot_luis@bots.local', 'bot_luis', null, 'Luis (bot)', 1510, true),
       ('bot_sara@bots.local', 'bot_sara', null, 'Sara (bot)', 1260, true)
on conflict do nothing;
