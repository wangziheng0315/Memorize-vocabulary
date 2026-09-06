create table if not exists public."User" (
  id serial primary key,
  email varchar(254) not null,
  password varchar(64) not null
);

do $$
begin
  if exists (
    select 1
    from public."User"
    where email is null
      or btrim(email) = ''
      or password is null
      or btrim(password) = ''
  ) then
    raise exception 'Cannot migrate public."User": email and password must be present.';
  end if;

  if exists (
    select 1
    from public."User"
    group by lower(btrim(email))
    having count(*) > 1
  ) then
    raise exception 'Cannot migrate public."User": duplicate email addresses exist after normalization.';
  end if;
end $$;

update public."User"
set email = lower(btrim(email))
where email is distinct from lower(btrim(email));

alter table public."User"
  alter column email type varchar(254),
  alter column email set not null,
  alter column password set not null;

create unique index "User_email_unique" on public."User" (email);
