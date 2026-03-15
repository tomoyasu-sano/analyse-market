import { GoogleGenAI } from '@google/genai'
import * as fs from 'fs'
import * as path from 'path'

// .env を手動ロード（dotenv 不使用）
const envPath = path.join(__dirname, '../../.env')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length > 0 && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  }
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env')

const ai = new GoogleGenAI({ apiKey })

export async function generateText(prompt: string): Promise<{ text: string; tokensUsed: number }> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  })
  const text = response.text ?? ''
  const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
  return { text, tokensUsed }
}
