import { AIProvider, Message } from '../types';
import { SOLANA_SYSTEM_PROMPT } from './ai-providers';
import { SOLANA_TOOLS, solanaTools } from './solana-tools';

// Enhanced system prompt with tool awareness
export const SOLANA_AGENT_PROMPT = `${SOLANA_SYSTEM_PROMPT}

You have access to the following Solana blockchain tools:
- get_sol_balance: Check SOL balance of any wallet
- get_token_balances: Get SPL token holdings
- get_transaction: Look up transaction details
- get_recent_transactions: Get recent wallet activity
- get_token_info: Get token metadata
- get_sol_price: Current SOL/USD price
- get_token_price: Price of any SPL token
- lookup_domain: Resolve .sol domains
- get_stake_accounts: View staking positions
- get_nfts: List NFTs in a wallet

When users ask about wallet balances, transactions, or on-chain data, use these tools to provide accurate, real-time information.`;

// Claude with tool use
export async function claudeWithTools(
  messages: Message[],
  model: string,
  apiKey: string,
  walletAddress?: string
): Promise<string> {
  const baseUrl = 'https://api.anthropic.com/v1/messages';

  // Convert tools to Claude format
  const claudeTools = SOLANA_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));

  const formattedMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  let systemPrompt = SOLANA_AGENT_PROMPT;
  if (walletAddress) {
    systemPrompt += `\n\nThe user's connected wallet address is: ${walletAddress}`;
  }

  // First API call
  let response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      tools: claudeTools,
      messages: formattedMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Claude API error');
  }

  let data = await response.json();

  // Handle tool use loop
  while (data.stop_reason === 'tool_use') {
    const assistantMessage = data.content;
    const toolUseBlocks = assistantMessage.filter((block: any) => block.type === 'tool_use');

    // Execute tools
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (toolUse: any) => {
        const result = await solanaTools.executeTool(toolUse.name, toolUse.input);
        return {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        };
      })
    );

    // Continue conversation with tool results
    formattedMessages.push({ role: 'assistant', content: assistantMessage });
    formattedMessages.push({ role: 'user', content: toolResults } as any);

    response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: claudeTools,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
    }

    data = await response.json();
  }

  // Extract text response
  const textBlock = data.content.find((block: any) => block.type === 'text');
  return textBlock?.text || '';
}

// OpenAI with function calling
export async function openaiWithTools(
  messages: Message[],
  model: string,
  apiKey: string,
  walletAddress?: string
): Promise<string> {
  const baseUrl = 'https://api.openai.com/v1/chat/completions';

  // Convert tools to OpenAI format
  const openaiTools = SOLANA_TOOLS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  let systemPrompt = SOLANA_AGENT_PROMPT;
  if (walletAddress) {
    systemPrompt += `\n\nThe user's connected wallet address is: ${walletAddress}`;
  }

  const formattedMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
  ];

  // First API call
  let response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      tools: openaiTools,
      tool_choice: 'auto',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  let data = await response.json();
  let assistantMessage = data.choices[0].message;

  // Handle tool calls loop
  while (assistantMessage.tool_calls) {
    formattedMessages.push(assistantMessage);

    // Execute tools
    for (const toolCall of assistantMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await solanaTools.executeTool(toolCall.function.name, args);

      formattedMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    // Continue conversation
    response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        tools: openaiTools,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    data = await response.json();
    assistantMessage = data.choices[0].message;
  }

  return assistantMessage.content || '';
}

// Gemini with function calling
export async function geminiWithTools(
  messages: Message[],
  model: string,
  apiKey: string,
  walletAddress?: string
): Promise<string> {
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Convert tools to Gemini format
  const geminiTools = {
    function_declarations: SOLANA_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  };

  let systemPrompt = SOLANA_AGENT_PROMPT;
  if (walletAddress) {
    systemPrompt += `\n\nThe user's connected wallet address is: ${walletAddress}`;
  }

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  // First API call
  let response = await fetch(`${baseUrl}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      tools: [geminiTools],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

  let data = await response.json();
  let candidate = data.candidates?.[0];

  // Handle function calls loop
  while (candidate?.content?.parts?.some((p: any) => p.functionCall)) {
    const functionCalls = candidate.content.parts.filter((p: any) => p.functionCall);

    // Execute tools
    const functionResponses = await Promise.all(
      functionCalls.map(async (fc: any) => {
        const result = await solanaTools.executeTool(fc.functionCall.name, fc.functionCall.args);
        return {
          functionResponse: {
            name: fc.functionCall.name,
            response: JSON.parse(result),
          },
        };
      })
    );

    // Add to conversation
    contents.push({
      role: 'model',
      parts: candidate.content.parts,
    });
    contents.push({
      role: 'user',
      parts: functionResponses,
    });

    // Continue conversation
    response = await fetch(`${baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        tools: [geminiTools],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    data = await response.json();
    candidate = data.candidates?.[0];
  }

  // Extract text response
  const textPart = candidate?.content?.parts?.find((p: any) => p.text);
  return textPart?.text || '';
}

// Doubao with function calling (via Volcano Engine)
export async function doubaoWithTools(
  messages: Message[],
  model: string,
  apiKey: string,
  walletAddress?: string
): Promise<string> {
  const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

  // Doubao uses OpenAI-compatible format
  const tools = SOLANA_TOOLS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  let systemPrompt = SOLANA_AGENT_PROMPT;
  if (walletAddress) {
    systemPrompt += `\n\nThe user's connected wallet address is: ${walletAddress}`;
  }

  const formattedMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
  ];

  let response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      tools,
      tool_choice: 'auto',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Doubao API error');
  }

  let data = await response.json();
  let assistantMessage = data.choices[0].message;

  // Handle tool calls
  while (assistantMessage.tool_calls) {
    formattedMessages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await solanaTools.executeTool(toolCall.function.name, args);

      formattedMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        tools,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Doubao API error');
    }

    data = await response.json();
    assistantMessage = data.choices[0].message;
  }

  return assistantMessage.content || '';
}

// Unified chat with tools function
export async function chatWithTools(
  provider: AIProvider,
  messages: Message[],
  model: string,
  apiKey: string,
  walletAddress?: string
): Promise<string> {
  switch (provider) {
    case 'claude':
      return claudeWithTools(messages, model, apiKey, walletAddress);
    case 'openai':
      return openaiWithTools(messages, model, apiKey, walletAddress);
    case 'gemini':
      return geminiWithTools(messages, model, apiKey, walletAddress);
    case 'doubao':
      return doubaoWithTools(messages, model, apiKey, walletAddress);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
