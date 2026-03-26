# Plan: Per-User Authentication with Supabase Auth

## Context

The app currently has no authentication — all videos and chunks are globally shared, RLS policies allow all operations, and any user can see/delete anyone's data. This change adds per-user isolation using Supabase Auth with magic link (email) login.

## Key Design Decisions

1. **Auth method:** Magic link email (free tier, no OAuth config needed)
2. **Package:** `@supabase/ssr` for Next.js App Router cookie-based sessions
3. **youtube_id constraint:** Change from globally unique to `unique(user_id, youtube_id)` so different users can ingest the same video
4. **user_id on chunks:** Add directly (not via join) — simpler RLS and needed for `match_chunks` RPC which bypasses RLS
5. **Login page:** Separate `/login` route with middleware redirect
6. **MCP:** Use `REWIND_USER_ID` env var + service role key for local-only operation

## Steps

### Step 1 — Install dependencies & env vars

- `npm install @supabase/ssr`
- Add to `.env` and `.env.example`:
  - `NEXT_PUBLIC_SUPABASE_URL` (same value as `SUPABASE_URL`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same value as `SUPABASE_ANON_KEY`)
  - `SUPABASE_SERVICE_ROLE_KEY` (for MCP server)
  - `REWIND_USER_ID` (for MCP server, optional)

### Step 2 — Database migration

Create `supabase/migrations/001_add_user_auth.sql`:

- Add `user_id uuid references auth.users(id)` to `videos` and `chunks`
- Drop `videos_youtube_id_key`, add `unique(user_id, youtube_id)`
- Drop all 8 existing `anon_*` RLS policies
- Create new policies for `authenticated` role scoped to `auth.uid() = user_id`
- Grant permissions to `authenticated` role
- Update `match_chunks` and `match_chunks_all` to accept `match_user_id` parameter with `WHERE user_id = match_user_id` filtering
- Update `supabase/schema.sql` to reflect the new baseline

### Step 3 — Supabase client refactor

Create three new files, keep existing `lib/supabase.ts` for MCP:

- **`lib/supabase/client.ts`** — `createBrowserClient()` using `NEXT_PUBLIC_*` vars (for frontend auth)
- **`lib/supabase/server.ts`** — `createServerClient()` with cookie handling (for API routes)
- **`lib/supabase/middleware.ts`** — session refresh helper with redirect to `/login` for unauthenticated users

### Step 4 — Auth helper

Create `lib/auth.ts`:
- `getAuthUser()` — calls `supabase.auth.getUser()` via server client, returns user or null

### Step 5 — Update middleware

Modify `middleware.ts`:
- Keep existing CORS logic for `/api/*` routes
- Add Supabase session refresh via `updateSession()` from step 3
- Expand matcher to cover all routes (exclude `_next/static`, `_next/image`, `favicon.ico`, `/login`, `/auth`)

### Step 6 — Login page & auth callback

- **`app/login/page.tsx`** — email input + "Send magic link" button using `supabase.auth.signInWithOtp()`
- **`app/auth/callback/route.ts`** — exchanges auth code for session, redirects to `/`

### Step 7 — Update API routes

All 4 routes get auth check at the top:

- **`app/api/ingest/route.ts`** — call `getAuthUser()`, 401 if null, pass `user.id` to `ingest()`
- **`app/api/query/route.ts`** — call `getAuthUser()`, 401 if null, pass `user.id` to `search()`
- **`app/api/videos/route.ts`** — call `getAuthUser()`, 401 if null, filter by `user_id` or rely on RLS via authenticated server client
- **`app/api/videos/[id]/route.ts`** — call `getAuthUser()`, 401 if null, RLS ensures ownership

### Step 8 — Update lib modules

- **`lib/ingest.ts`** — add `userId` parameter, include `user_id` in video and chunk inserts, scope duplicate check to user
- **`lib/search.ts`** — add `userId` parameter, pass `match_user_id` to RPC calls

### Step 9 — Frontend updates

- Add logout button to sidebar in `app/page.tsx` (call `supabase.auth.signOut()`)
- Optionally display user email in sidebar

### Step 10 — MCP server update

- Create `lib/supabase-admin.ts` — service role client using `SUPABASE_SERVICE_ROLE_KEY`
- Update MCP tools to read `REWIND_USER_ID` env var and pass it to lib functions
- Update MCP tools to use admin client instead of anon client

### Step 11 — Data migration

- After signing up as first user, run SQL to assign existing data: `UPDATE videos SET user_id = '<uuid>'; UPDATE chunks SET user_id = '<uuid>';`
- Then add `NOT NULL` constraint to both `user_id` columns

## Files to modify

| File | Change |
|---|---|
| `package.json` | Add `@supabase/ssr` |
| `.env` / `.env.example` | Add `NEXT_PUBLIC_*` vars, service role key |
| `supabase/schema.sql` | Update baseline schema with user_id, new RLS, updated functions |
| `lib/supabase.ts` | Keep as-is (MCP only) |
| `lib/supabase/client.ts` | **New** — browser client |
| `lib/supabase/server.ts` | **New** — server client with cookies |
| `lib/supabase/middleware.ts` | **New** — session refresh helper |
| `lib/auth.ts` | **New** — `getAuthUser()` helper |
| `middleware.ts` | Add auth session refresh + redirect logic |
| `app/login/page.tsx` | **New** — login page |
| `app/auth/callback/route.ts` | **New** — auth callback |
| `app/api/ingest/route.ts` | Add auth check, pass userId |
| `app/api/query/route.ts` | Add auth check, pass userId |
| `app/api/videos/route.ts` | Add auth check |
| `app/api/videos/[id]/route.ts` | Add auth check |
| `lib/ingest.ts` | Add userId param, include in inserts |
| `lib/search.ts` | Add userId param, pass to RPC |
| `app/page.tsx` | Add logout button |
| `lib/supabase-admin.ts` | **New** — service role client for MCP |
| `mcp/tools/*.ts` | Add userId from env, use admin client |

## Verification

1. Run `npm run dev`, confirm redirect to `/login`
2. Click Google or GitHub OAuth button, complete sign-in — confirm redirect to `/`
3. Ingest a video — confirm `user_id` is set in Supabase `videos` and `chunks` tables
4. Query the video — confirm results scoped to user
5. Open incognito, sign in as a different user — confirm they see an empty library
6. Ingest the same YouTube URL as user 2 — confirm it works (no unique constraint violation)
7. Confirm user 1 still only sees their own videos
8. Test delete — confirm user can only delete their own videos
9. Test MCP with `REWIND_USER_ID` set — confirm tools work and scope to that user
10. Deploy to Vercel with new env vars, test the full flow in production
