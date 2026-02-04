export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ILLMClient {
  sendMessage(messages: Message[]): Promise<string>;
}

export class LLMClient implements ILLMClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey?: string, apiUrl?: string) {
    this.apiKey = apiKey || process.env.LLM_API_KEY || '';
    this.apiUrl = apiUrl || process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
  }

  async sendMessage(messages: Message[]): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \Bearer \\
      },
      body: JSON.stringify({ messages })
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
