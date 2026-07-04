import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let ai;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export async function askGemini(query, context, history = []) {
  if (!ai) {
    throw new Error('Gemini API key is not configured.');
  }

  const systemPrompt = `You are the Majestique Euriska Dashboard AI Assistant.
Your primary role is to answer questions about the residential society based on the provided context.
Rules:
1. NEVER guess information. If the data is not in the context, say you don't know.
2. Format your response clearly using Markdown (lists, bolding, etc.).
3. Be concise and professional.
4. If context is provided, use it to accurately answer the question.

Context Data:
${context || 'No specific data found for this query.'}`;

  try {
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // For genai SDK v1+, chat sessions are typically created like this:
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({
      message: query
    });

    return response.text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}
