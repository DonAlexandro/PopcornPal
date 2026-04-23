alter table public.movies
alter column genres type text[]
using case
	when genres is null then null
	else array[genres]
end;
