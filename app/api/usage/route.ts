import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

const DAILY_INGEST_LIMIT = 10

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count, error } = await getAdminClient()
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    used: count ?? 0,
    limit: DAILY_INGEST_LIMIT,
  })
}
