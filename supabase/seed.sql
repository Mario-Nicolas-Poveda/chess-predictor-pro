-- Solo para desarrollo local. En producción esta cuenta está desactivada (password_hash nulo → 401).
-- usuario demo: demo@chesspredictor.dev / Demo1234
insert into public.users (email, username, password_hash, display_name, country)
values ('demo@chesspredictor.dev', 'demo',
        extensions.crypt('Demo1234', extensions.gen_salt('bf', 10)), 'Usuario Demo', 'CO');
