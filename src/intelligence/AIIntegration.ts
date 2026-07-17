/**
 * Aether OS - Real AI Integration
 * Claude API & OpenAI GPT Integration with fallback
 */

import { EventBus, Events } from '../core/EventBus';

export interface AIConfig {
  provider: 'claude' | 'openai' | 'gemini' | 'local';
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  provider: string;
}

export interface ToolRequest {
  intent: string;
  entities: any;
  context?: string;
}

export class AIIntegration {
  private eventBus: EventBus;
  private config: AIConfig;
  private isConfigured: boolean = false;
  private fallbackMode: boolean = true;

  constructor(eventBus?: EventBus, config?: Partial<AIConfig>) {
    this.eventBus = eventBus || new EventBus();
    this.config = {
      provider: config?.provider || 'local',
      apiKey: config?.apiKey || import.meta.env.VITE_AI_API_KEY || '',
      endpoint: config?.endpoint,
      model: config?.model || this.getDefaultModel(config?.provider || 'local'),
      maxTokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.7
    };
    this.isConfigured = !!this.config.apiKey || this.config.provider === 'local';
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'claude': return 'claude-3-sonnet-20240229';
      case 'openai': return 'gpt-4-turbo-preview';
      case 'gemini': return 'gemini-pro';
      case 'local': return 'llama3';
      default: return 'claude-3-sonnet-20240229';
    }
  }

  /**
   * Send a chat message to AI
   */
  async chat(message: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.isConfigured || this.config.provider === 'local') {
      return this.simulateResponse(message);
    }

    try {
      switch (this.config.provider) {
        case 'claude':
          return await this.callClaude(message, systemPrompt);
        case 'openai':
          return await this.callOpenAI(message, systemPrompt);
        case 'gemini':
          return await this.callGemini(message, systemPrompt);
        default:
          return this.simulateResponse(message);
      }
    } catch (error) {
      console.error('AI API Error:', error);
      this.eventBus.emit(Events.TOOL_ERROR, { error: String(error) });
      return this.simulateResponse(message);
    }
  }

  /**
   * Generate UI tool from natural language
   */
  async generateTool(request: ToolRequest): Promise<{
    components: any[];
    explanation: string;
    metadata: any;
  }> {
    const prompt = this.buildToolPrompt(request);
    const response = await this.chat(prompt);

    return this.parseToolResponse(response.content, request);
  }

  private buildToolPrompt(request: ToolRequest): string {
    return `You are an AI assistant for Aether OS, a spatial operating system.
Based on the user's request, generate appropriate UI components.

Request: ${request.intent}
Entities: ${JSON.stringify(request.entities)}
Context: ${request.context || 'General task'}

Respond ONLY with valid JSON in this format:
{
  "components": [
    {
      "type": "table|chart|calculator|form|metric|editor|list",
      "data": {...}
    }
  ],
  "explanation": "Brief explanation of what was generated",
  "metadata": {
    "title": "Tool name",
    "intent": "detected intent"
  }
}

Example for "show sales chart":
{
  "components": [
    {
      "type": "chart",
      "data": {
        "chartType": "bar",
        "labels": ["Jan", "Feb", "Mar"],
        "values": [100, 150, 200]
      }
    }
  ],
  "explanation": "Generated a bar chart showing sales data",
  "metadata": {"title": "Sales Chart", "intent": "visualize"}
}

Respond with ONLY the JSON, no markdown formatting.`;
  }

  private parseToolResponse(content: string, request: ToolRequest): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse AI response as JSON:', e);
    }

    // Return default tool if parsing fails
    return {
      components: [
        {
          type: 'editor',
          data: { content: content, mode: 'markdown' }
        }
      ],
      explanation: 'AI Response',
      metadata: { title: 'Generated Tool', intent: request.intent }
    };
  }

  /**
   * Claude API Integration
   */
  private async callClaude(message: string, systemPrompt?: string): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt || 'You are a helpful AI assistant for Aether OS spatial operating system.',
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0].text,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens
      },
      model: data.model,
      provider: 'claude'
    };
  }

  /**
   * OpenAI API Integration
   */
  private async callOpenAI(message: string, systemPrompt?: string): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          { role: 'system', content: systemPrompt || 'You are a helpful AI assistant for Aether OS.' },
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens
      },
      model: data.model,
      provider: 'openai'
    };
  }

  /**
   * Google Gemini API Integration
   */
  private async callGemini(message: string, systemPrompt?: string): Promise<AIResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          systemInstruction: { parts: [{ text: systemPrompt || 'You are Aether OS AI assistant.' }] },
          generationConfig: {
            maxOutputTokens: this.config.maxTokens,
            temperature: this.config.temperature
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.candidates[0].content.parts[0].text,
      model: data.modelVersion || this.config.model,
      provider: 'gemini'
    };
  }

  /**
   * Simulated response for local/offline mode
   */
  private simulateResponse(message: string): AIResponse {
    const lower = message.toLowerCase();
    
    let response = 'I understand your request. ';
    
    if (lower.includes('calculate') || lower.includes('+') || lower.includes('-')) {
      response += 'I can help with calculations. Try typing a simple math expression like "50 + 30".';
    } else if (lower.includes('chart') || lower.includes('graph')) {
      response += 'I can generate charts. Try "show chart of sales data".';
    } else if (lower.includes('create') || lower.includes('make')) {
      response += 'I can create various tools. What would you like to create?';
    } else {
      response += 'Configure an AI API key (Claude, OpenAI, or Gemini) in your environment variables to enable full AI capabilities.';
    }

    return {
      content: response,
      model: 'local-simulated',
      provider: 'local'
    };
  }

  /**
   * Check if AI is configured and available
   */
  isAvailable(): boolean {
    return this.isConfigured && !!this.config.apiKey;
  }

  /**
   * Get current configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIConfig>) {
    this.config = { ...this.config, ...config };
    this.isConfigured = !!this.config.apiKey || this.config.provider === 'local';
  }
}

// Singleton instance
export const aiIntegration = new AIIntegration();
