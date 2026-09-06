do $$
begin
  if exists (
    select 1
    from public.words w
    left join public.books b on b.book_id = w."bookId"
    where w."bookId" is null or b.book_id is null
  ) then
    raise exception 'Cannot add words_book_id_fkey: every word must reference an existing book.';
  end if;

end $$;

update public.books b
set word_count = counts.actual_word_count,
    updated_at = now()
from (
  select b.id, count(w.id)::integer as actual_word_count
  from public.books b
  left join public.words w on w."bookId" = b.book_id
  group by b.id
) counts
where b.id = counts.id
  and b.word_count is distinct from counts.actual_word_count;

alter table public.words
  alter column "bookId" set not null;

alter table public.words
  add constraint words_book_id_fkey
  foreign key ("bookId") references public.books(book_id)
  on update restrict on delete restrict;

create index words_book_rank_id_idx
  on public.words ("bookId", "wordRank", id);
