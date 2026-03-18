import { search } from '../lib/search'
import { buildPrompt } from '../lib/buildPrompt'
import { generate } from '../lib/generate'

const QUESTION = process.argv[2] || 'What is this song about?'

async function main() {
  console.log('Question:', QUESTION)

  console.log('\n--- Search ---')
  const chunks = await search(QUESTION)
  console.log(`Found ${chunks.length} chunks`)
  for (const c of chunks) {
    console.log(`  [${c.start_time}s] similarity=${c.similarity.toFixed(3)} "${c.content.slice(0, 80)}..."`)
  }

  console.log('\n--- Generate ---')
  const prompt = buildPrompt(chunks)
  const result = await generate(prompt, QUESTION)

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk)
  }
  console.log()
}

main().catch(console.error)
