import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await getAdminClient()
    .from('videos')
    .select('id, youtube_id, title, thumbnail, channel, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
