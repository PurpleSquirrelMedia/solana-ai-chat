import { AIProvider, AIProviderConfig, Message } from '../types';

// Provider configurations
export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic\'s Claude - Advanced reasoning and analysis',
    icon: '🟣',
    color: '#8B5CF6',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000 },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000 },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', contextWindow: 200000 },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models - Versatile and widely capable',
    icon: '🟢',
    color: '#10B981',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
      { id: 'o1', name: 'o1', contextWindow: 200000 },
      { id: 'o1-mini', name: 'o1-mini', contextWindow: 128000 },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google\'s Gemini - Multimodal understanding',
    icon: '🔵',
    color: '#3B82F6',
    models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', contextWindow: 1000000 },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000 },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000 },
    ],
  },
  doubao: {
    id: 'doubao',
    name: 'Doubao',
    description: 'ByteDance\'s Doubao - Cost-effective Chinese & English',
    icon: '🔴',
    color: '#EF4444',
    models: [
      { id: 'doubao-1.5-pro-32k', name: 'Doubao 1.5 Pro', contextWindow: 32000 },
      { id: 'doubao-1.5-lite-32k', name: 'Doubao 1.5 Lite', contextWindow: 32000 },
      { id: 'doubao-pro-256k', name: 'Doubao Pro 256k', contextWindow: 256000 },
    ],
  },
};

// System prompt for Solana-aware AI
export const SOLANA_SYSTEM_PROMPT = `You are a helpful AI assistant integrated into a Solana mobile wallet app on the Solana Seeker device.

You have knowledge about:
- Solana blockchain, SPL tokens, and the Solana ecosystem
- DeFi protocols on Solana (Jupiter, Raydium, Marinade, etc.)
- NFTs and digital collectibles on Solana
- The Solana Mobile Stack and dApp development
- Cryptocurrency trading, staking, and portfolio management

When the user's wallet is connected, you can see their wallet address and SOL balance. Use this context to provide personalized assistance.

Be concise and mobile-friendly in your responses. Use clear formatting when explaining complex topics.`;

// Abstract AI service interface
export interface AIService {
  chat(messages: Message[], model: string, apiKey: string): Promise<string>;
  stream?(messages: Message[], model: string, apiKey: string, onChunk: (chunk: string) => void): Promise<void>;
}

// Claude Service
export class ClaudeService implements AIService {
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  async chat(messages: Message[], model: string, apiKey: string): Promise<string> {
    const formattedMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemMessage = messages.find(m => m.role === 'system')?.content || SOLANA_SYSTEM_PROMPT;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemMessage,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
    }

    const data = await response.json();
    return data.content[0].text;
  }
}

// OpenAI Service
export class OpenAIService implements AIService {
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  async chat(messages: Message[], model: string, apiKey: string): Promise<string> {
    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Add system message if not present
    if (!formattedMessages.find(m => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: SOLANA_SYSTEM_PROMPT });
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Gemini Service
export class GeminiService implements AIService {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  async chat(messages: Message[], model: string, apiKey: string): Promise<string> {
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content || SOLANA_SYSTEM_PROMPT;

    const response = await fetch(
      `${this.baseUrl}/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
}

// Doubao Service (via Volcano Engine)
export class DoubaoService implements AIService {
  private baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

  async chat(messages: Message[], model: string, apiKey: string): Promise<string> {
    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    if (!formattedMessages.find(m => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: SOLANA_SYSTEM_PROMPT });
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Doubao API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Factory to get the right service
export function getAIService(provider: AIProvider): AIService {
  switch (provider) {
    case 'claude':
      return new ClaudeService();
    case 'openai':
      return new OpenAIService();
    case 'gemini':
      return new GeminiService();
    case 'doubao':
      return new DoubaoService();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
