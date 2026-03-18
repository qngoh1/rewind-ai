import { InferenceClient } from '@huggingface/inference'

const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY!)
const MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const EXPECTED_DIMENSIONS = 384

export async function embed(text: string): Promise<number[]> {
  const result = await client.featureExtraction({
    model: MODEL,
    inputs: text,
  })

  const embedding = result as number[]
  if (embedding.length !== EXPECTED_DIMENSIONS) {
    throw new Error(`Expected ${EXPECTED_DIMENSIONS} dimensions, got ${embedding.length}`)
  }

  return embedding
}
