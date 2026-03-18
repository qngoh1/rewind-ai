import { supabase } from '../lib/supabase.js'

async function main() {
  // Try a simple RPC call to check connection
  const { data, error } = await supabase.rpc('match_chunks_all', {
    query_embedding: Array(768).fill(0),
    match_count: 1
  })
  if (error) {
    console.error('RPC ERROR:', error.message)
    // Try raw select as fallback
    const res = await supabase.from('videos').select('id').limit(1)
    if (res.error) console.error('SELECT ERROR:', res.error.message, res.error.details)
    else console.log('SELECT SUCCESS:', res.data)
    return
  }
  console.log('SUCCESS — connection works, match_chunks_all returned', data.length, 'rows')
}

main()
