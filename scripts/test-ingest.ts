import { extractVideoId, getTranscript, getVideoMetadata } from '../lib/getTranscript'
import { chunkTranscript } from '../lib/chunkTranscript'
import { embed } from '../lib/embed'
import { ingest } from '../lib/ingest'

const TEST_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

async function main() {
  const step = process.argv[2] || 'all'

  // Step 1: Extract video ID
  const videoId = extractVideoId(TEST_URL)
  console.log('Video ID:', videoId)

  if (step === 'transcript' || step === 'all') {
    console.log('\n--- Step 1: Fetch transcript ---')
    const segments = await getTranscript(videoId)
    console.log(`Got ${segments.length} segments`)
    console.log('First 3:', segments.slice(0, 3))

    if (step === 'all') {
      console.log('\n--- Step 2: Fetch metadata ---')
      const metadata = await getVideoMetadata(videoId)
      console.log('Metadata:', metadata)

      console.log('\n--- Step 3: Chunk transcript ---')
      const chunks = chunkTranscript(segments)
      console.log(`Created ${chunks.length} chunks`)
      console.log('First chunk:', {
        content: chunks[0].content.slice(0, 100) + '...',
        startTime: chunks[0].startTime,
        endTime: chunks[0].endTime,
      })

      console.log('\n--- Step 4: Embed sample ---')
      const embedding = await embed('test sentence for embedding')
      console.log(`Embedding length: ${embedding.length}`)

      console.log('\n--- Step 5: Full ingest ---')
      const result = await ingest(TEST_URL)
      console.log('Ingest result:', result)
    }
  }
}

main().catch(console.error)
