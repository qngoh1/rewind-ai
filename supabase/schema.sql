-- Enable pgvector
create extension if not exists vector;

-- Videos table
create table videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text unique not null,
  title text,
  thumbnail text,
  duration int,
  channel text,
  created_at timestamp default now()
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
  created_at timestamp default now()
);

-- HNSW index for fast similarity search
create index on chunks using hnsw (embedding vector_cosine_ops);

-- Similarity search for a single video
create or replace function match_chunks(
  query_embedding vector(384),
  match_video_id uuid,
  match_count int default 5
)
returns table(id uuid, video_id uuid, content text, start_time int, end_time int, similarity float)
language sql as $$
  select id, video_id, content, start_time, end_time,
    1 - (embedding <=> query_embedding) as similarity
  from chunks
  where video_id = match_video_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Similarity search across all videos
create or replace function match_chunks_all(
  query_embedding vector(384),
  match_count int default 5
)
returns table(id uuid, video_id uuid, content text, start_time int, end_time int, similarity float)
language sql as $$
  select id, video_id, content, start_time, end_time,
    1 - (embedding <=> query_embedding) as similarity
  from chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Enable RLS
alter table videos enable row level security;
alter table chunks enable row level security;

-- Grant table permissions to anon role
grant select, insert, update, delete on videos to anon;
grant select, insert, update, delete on chunks to anon;

-- Allow all operations (no auth)
create policy "anon_select_videos" on videos for select to anon using (true);
create policy "anon_insert_videos" on videos for insert to anon with check (true);
create policy "anon_update_videos" on videos for update to anon using (true) with check (true);
create policy "anon_delete_videos" on videos for delete to anon using (true);
create policy "anon_select_chunks" on chunks for select to anon using (true);
create policy "anon_insert_chunks" on chunks for insert to anon with check (true);
create policy "anon_update_chunks" on chunks for update to anon using (true) with check (true);
create policy "anon_delete_chunks" on chunks for delete to anon using (true);
