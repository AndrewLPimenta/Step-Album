-- Migration 004: Open albums and problems SELECT to all authenticated users.
-- Previously diagramadores could only see their own albums.
-- Write restrictions (insert/update/delete) remain unchanged.

drop policy "albums_select" on public.albums;
create policy "albums_select"
  on public.albums for select
  to authenticated
  using (true);

drop policy "problems_select" on public.album_problems;
create policy "problems_select"
  on public.album_problems for select
  to authenticated
  using (true);
