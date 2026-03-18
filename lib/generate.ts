import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function generate(systemPrompt: string, question: string) {
  return streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    prompt: question,
  })
}
