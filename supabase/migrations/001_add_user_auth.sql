-- Add user_id to videos and chunks
alter table videos add column user_id uuid references auth.users(id);
alter table chunks add column user_id uuid references auth.users(id);

-- Change youtube_id from globally unique to unique per user
alter table videos drop constraint videos_youtube_id_key;
alter table videos add constraint videos_user_youtube_unique unique (user_id, youtube_id);

-- Drop all existing permissive anon policies
drop policy "anon_select_videos" on videos;
drop policy "anon_insert_videos" on videos;
drop policy "anon_update_videos" on videos;
drop policy "anon_delete_videos" on videos;
drop policy "anon_select_chunks" on chunks;
drop policy "anon_insert_chunks" on chunks;
drop policy "anon_update_chunks" on chunks;
drop policy "anon_delete_chunks" on chunks;

-- Revoke anon permissions
revoke select, insert, update, delete on videos from anon;
revoke select, insert, update, delete on chunks from anon;

-- Grant permissions to authenticated role
grant select, insert, update, delete on videos to authenticated;
grant select, insert, update, delete on chunks to authenticated;

-- New RLS policies scoped to authenticated user
create policy "auth_select_videos" on videos
  for select to authenticated using (auth.uid() = user_id);

create policy "auth_insert_videos" on videos
  for insert to authenticated with check (auth.uid() = user_id);

create policy "auth_update_videos" on videos
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "auth_delete_videos" on videos
  for delete to authenticated using (auth.uid() = user_id);

create policy "auth_select_chunks" on chunks
  for select to authenticated using (auth.uid() = user_id);

create policy "auth_insert_chunks" on chunks
  for insert to authenticated with check (auth.uid() = user_id);

create policy "auth_update_chunks" on chunks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "auth_delete_chunks" on chunks
  for delete to authenticated using (auth.uid() = user_id);

-- Also allow service_role full access (for MCP server)
create policy "service_select_videos" on videos
  for select to service_role using (true);

create policy "service_select_chunks" on chunks
  for select to service_role using (true);

create policy "service_insert_videos" on videos
  for insert to service_role with check (true);

create policy "service_insert_chunks" on chunks
  for insert to service_role with check (true);

create policy "service_delete_videos" on videos
  for delete to service_role using (true);

create policy "service_delete_chunks" on chunks
  for delete to service_role using (true);

-- Update match_chunks to accept and filter by user_id
create or replace function match_chunks(
  query_embedding vector(384),
  match_video_id uuid,
  match_user_id uuid,
  match_count int default 5
)
returns table(id uuid, video_id uuid, content text, start_time int, end_time int, similarity float)
language sql as $$
  select id, video_id, content, start_time, end_time,
    1 - (embedding <=> query_embedding) as similarity
  from chunks
  where video_id = match_video_id
    and user_id = match_user_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Update match_chunks_all to accept and filter by user_id
create or replace function match_chunks_all(
  query_embedding vector(384),
  match_user_id uuid,
  match_count int default 5
)
returns table(id uuid, video_id uuid, content text, start_time int, end_time int, similarity float)
language sql as $$
  select id, video_id, content, start_time, end_time,
    1 - (embedding <=> query_embedding) as similarity
  from chunks
  where user_id = match_user_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
