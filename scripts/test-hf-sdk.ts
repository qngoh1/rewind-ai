import { InferenceClient } from '@huggingface/inference'

async function main() {
  const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY!)

  try {
    const result = await client.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: 'test sentence',
    })
    const embedding = result as number[]
    console.log('SUCCESS — dimensions:', embedding.length)
    console.log('First 5 values:', embedding.slice(0, 5))
  } catch (e: any) {
    console.error('FAILED:', e.message)
  }
}

main()
