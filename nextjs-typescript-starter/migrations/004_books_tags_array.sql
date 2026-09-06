do $$
declare
  tags_type text;
begin
  select c.udt_name
  into tags_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'books'
    and c.column_name = 'tags';

  if tags_type = 'text' then
    alter table public.books
      alter column tags type text[]
      using case
        when tags is null or btrim(tags) = '' then '{}'::text[]
        else regexp_split_to_array(btrim(tags), '\s*[,，]\s*')
      end;
  elsif tags_type is distinct from '_text' then
    raise exception 'Cannot migrate public.books.tags: expected text or text[], got %.', tags_type;
  end if;
end $$;

alter table public.books
  alter column tags set default '{}'::text[],
  alter column tags set not null;
