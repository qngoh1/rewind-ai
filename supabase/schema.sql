-- Enable pgvector
create extension if not exists vector;

-- Videos table
create table videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null,
  title text,
  thumbnail text,
  duration int,
  channel text,
  user_id uuid not null references auth.users(id),
  created_at timestamp default now(),
  constraint videos_user_youtube_unique unique (user_id, youtube_id)
);

-- Chunks table
create table chunks (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade,
  content text,
  embedding vector(384),
  start_time int,
  end_time int,
  chunk_index int,
  user_id uuid not null references auth.users(id),
  created_at timestamp default now()
);

-- HNSW index for fast similarity search
create index on chunks using hnsw (embedding vector_cosine_ops);

-- Similarity search for a single video
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

-- Similarity search across all videos
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

-- Enable RLS
alter table videos enable row level security;
alter table chunks enable row level security;

-- Grant table permissions to authenticated role
grant select, insert, update, delete on videos to authenticated;
grant select, insert, update, delete on chunks to authenticated;

-- RLS policies for authenticated users (scoped to own data)
create policy "auth_select_videos" on videos for select to authenticated using (auth.uid() = user_id);
create policy "auth_insert_videos" on videos for insert to authenticated with check (auth.uid() = user_id);
create policy "auth_update_videos" on videos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "auth_delete_videos" on videos for delete to authenticated using (auth.uid() = user_id);
create policy "auth_select_chunks" on chunks for select to authenticated using (auth.uid() = user_id);
create policy "auth_insert_chunks" on chunks for insert to authenticated with check (auth.uid() = user_id);
create policy "auth_update_chunks" on chunks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "auth_delete_chunks" on chunks for delete to authenticated using (auth.uid() = user_id);

-- Service role policies (for MCP server)
create policy "service_select_videos" on videos for select to service_role using (true);
create policy "service_select_chunks" on chunks for select to service_role using (true);
create policy "service_insert_videos" on videos for insert to service_role with check (true);
create policy "service_insert_chunks" on chunks for insert to service_role with check (true);
create policy "service_delete_videos" on videos for delete to service_role using (true);
create policy "service_delete_chunks" on chunks for delete to service_role using (true);
