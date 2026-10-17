import { GoogleGenAI } from '@google/genai';

export const OFFLINE_DEMO_MESSAGE =
`Hello! I am PathAI, your learning and career assistant. Currently running in offline demo mode so you can test all features right away without needing an API key.

Here are things we can do together:
• AI Chat & study questions
• Generate multiple-choice quizzes from your syllabus
• Summarize lengthy notes and articles
• Mock interview practice with real-time feedback
• Create structured career milestone roadmaps

What would you like to explore today?`;

export function hasLiveApiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return Boolean(apiKey.trim() && apiKey !== 'mock' && apiKey.length > 20);
}

export async function generateText(
  prompt: string,
  system: string = '',
  maxTokens: number = 700
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (hasLiveApiKey()) {
    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey!,
      });

      const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
      });

      const text = response.text?.trim();
      if (text) {
        return text;
      }
    } catch {
      // Quiet fallback without throwing or triggering error logs
    }
  }

  // When no API key is provided, return the standard offline demo message
  return OFFLINE_DEMO_MESSAGE;
}
