-- usuario demo: demo@chesspredictor.dev / Demo1234
insert into public.users (email, username, password_hash, display_name, country)
values ('demo@chesspredictor.dev', 'demo',
        extensions.crypt('Demo1234', extensions.gen_salt('bf', 10)), 'Usuario Demo', 'CO');
