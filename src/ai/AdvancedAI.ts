/**
 * Aether OS - Advanced AI Module
 * Local LLM, autonomous agents, predictive actions
 */

import { EventBus } from '../core/EventBus';
import { AIIntegration } from '../intelligence/AIIntegration';
import { ComputationWorker } from '../performance/PerformanceOptimizer';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'local';
  endpoint?: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AutonomousAgent {
  id: string;
  name: string;
  role: string;
  goals: string[];
  capabilities: string[];
  status: 'idle' | 'thinking' | 'executing' | 'waiting';
  memory: AgentMemory;
  currentTask?: Task;
}

export interface AgentMemory {
  recent: MemoryItem[];
  longTerm: MemoryItem[];
  maxRecent: number;
  maxLongTerm: number;
}

export interface MemoryItem {
  content: string;
  timestamp: number;
  importance: number;
  type: 'observation' | 'thought' | 'action' | 'result';
}

export interface Task {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  steps: TaskStep[];
  currentStep: number;
  result?: any;
}

export interface TaskStep {
  description: string;
  action: string;
  params?: Record<string, any>;
  status?: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
}

export interface PredictiveAction {
  type: string;
  confidence: number;
  trigger: string;
  suggestedInput?: string;
}

export class LocalLLMManager {
  private eventBus: EventBus;
  private worker: ComputationWorker;
  private models: Map<string, LLMConfig> = new Map();
  private activeModel: string = 'llama3';

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.worker = new ComputationWorker();
    this.initializeDefaultModels();
  }

  private initializeDefaultModels(): void {
    // OpenAI models
    this.models.set('gpt-4', {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 4096
    });

    // Anthropic models
    this.models.set('claude', {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 4096
    });

    // Ollama (local)
    this.models.set('llama3', {
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3',
      temperature: 0.7,
      maxTokens: 2048
    });

    // Llama 3 via Ollama
    this.models.set('mistral', {
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'mistral',
      temperature: 0.7,
      maxTokens: 2048
    });

    // Phi-3 via Ollama
    this.models.set('phi3', {
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'phi3',
      temperature: 0.7,
      maxTokens: 2048
    });
  }

  async checkOllamaStatus(): Promise<{ available: boolean; models: string[] }> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          models: data.models?.map((m: any) => m.name) || []
        };
      }
    } catch (e) {
      console.log('Ollama not available');
    }
    return { available: false, models: [] };
  }

  async generateWithOllama(prompt: string, model?: string): Promise<string> {
    const modelName = model || this.activeModel;
    const config = this.models.get(modelName);

    if (!config || config.provider !== 'ollama') {
      throw new Error('Model not configured for Ollama');
    }

    try {
      const response = await fetch(`${config.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          prompt,
          stream: false,
          options: {
            temperature: config.temperature,
            num_predict: config.maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (e) {
      console.error('Ollama generation failed:', e);
      throw e;
    }
  }

  async embedText(text: string): Promise<number[]> {
    // Generate embeddings using the computation worker
    const embeddings = await this.worker.generateEmbeddings([text], 384);
    return embeddings[0];
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return this.worker.generateEmbeddings(texts, 384);
  }

  setActiveModel(modelName: string): void {
    if (this.models.has(modelName)) {
      this.activeModel = modelName;
      console.log(`🤖 Active model: ${modelName}`);
    }
  }

  getAvailableModels(): LLMConfig[] {
    return Array.from(this.models.values());
  }
}

// Autonomous Agent System
export class AutonomousAgentSystem {
  private eventBus: EventBus;
  private llm: LocalLLMManager;
  private agents: Map<string, AutonomousAgent> = new Map();
  private taskQueue: Task[] = [];
  private isRunning: boolean = false;

  constructor(eventBus: EventBus, llm: LocalLLMManager) {
    this.eventBus = eventBus;
    this.llm = llm;
    this.initializeDefaultAgents();
  }

  private initializeDefaultAgents(): void {
    this.createAgent({
      name: 'Research Assistant',
      role: 'Research and analysis',
      goals: ['Find relevant information', 'Summarize findings', 'Present insights'],
      capabilities: ['web_search', 'data_analysis', 'summarize']
    });

    this.createAgent({
      name: 'Code Assistant',
      role: 'Programming help',
      goals: ['Write code', 'Debug issues', 'Review code', 'Explain concepts'],
      capabilities: ['write_code', 'debug', 'review_code', 'explain']
    });

    this.createAgent({
      name: 'Project Manager',
      role: 'Task coordination',
      goals: ['Plan tasks', 'Track progress', 'Coordinate team', 'Manage deadlines'],
      capabilities: ['plan', 'organize', 'track', 'coordinate']
    });
  }

  createAgent(config: {
    name: string;
    role: string;
    goals: string[];
    capabilities: string[];
  }): AutonomousAgent {
    const agent: AutonomousAgent = {
      id: `agent-${Date.now()}`,
      name: config.name,
      role: config.role,
      goals: config.goals,
      capabilities: config.capabilities,
      status: 'idle',
      memory: {
        recent: [],
        longTerm: [],
        maxRecent: 50,
        maxLongTerm: 200
      }
    };

    this.agents.set(agent.id, agent);
    console.log(`🤖 Agent created: ${agent.name}`);
    
    return agent;
  }

  async assignTask(agentId: string, task: {
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<Task> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');

    const newTask: Task = {
      id: `task-${Date.now()}`,
      description: task.description,
      priority: task.priority || 'medium',
      status: 'pending',
      steps: [],
      currentStep: 0
    };

    // Generate task steps using LLM
    try {
      const stepsPrompt = `Break down this task into clear action steps:
Task: ${task.description}

Respond with a JSON array of steps, each with a "description" and "action" field.
Example: [{"description": "Research topic", "action": "research"}, {"description": "Write summary", "action": "write"}]`;

      const response = await this.llm.generateWithOllama(stepsPrompt);
      const stepsMatch = response.match(/\[.*\]/s);
      
      if (stepsMatch) {
        newTask.steps = JSON.parse(stepsMatch[0]);
      }
    } catch (e) {
      // Use default steps if LLM fails
      newTask.steps = [
        { description: task.description, action: 'execute' }
      ];
    }

    agent.currentTask = newTask;
    agent.status = 'thinking';

    this.eventBus.emit('agent:task-assigned', { agent, task: newTask });

    // Start execution
    this.executeTask(agent, newTask);

    return newTask;
  }

  private async executeTask(agent: AutonomousAgent, task: Task): Promise<void> {
    task.status = 'in_progress';
    agent.status = 'executing';

    for (let i = task.currentStep; i < task.steps.length; i++) {
      const step = task.steps[i];
      step.status = 'executing';
      task.currentStep = i;

      try {
        // Execute step based on action type
        const result = await this.executeStep(agent, step);
        step.status = 'completed';
        step.result = result;

        // Add to agent memory
        this.addToMemory(agent, {
          content: `Completed: ${step.description}`,
          importance: 0.7,
          type: 'result'
        });
      } catch (e) {
        step.status = 'failed';
        task.status = 'failed';
        agent.status = 'idle';
        break;
      }
    }

    if (task.status === 'in_progress') {
      task.status = 'completed';
    }

    agent.status = 'idle';
    agent.currentTask = undefined;

    this.eventBus.emit('agent:task-completed', { agent, task });
  }

  private async executeStep(agent: AutonomousAgent, step: TaskStep): Promise<any> {
    switch (step.action) {
      case 'research':
        return this.researchAction(agent, step);
      case 'write':
        return this.writeAction(agent, step);
      case 'analyze':
        return this.analyzeAction(agent, step);
      case 'plan':
        return this.planAction(agent, step);
      default:
        return this.genericAction(agent, step);
    }
  }

  private async researchAction(agent: AutonomousAgent, step: TaskStep): Promise<any> {
    const prompt = `As ${agent.name}, ${agent.role}, research the following:
${step.description}

Provide a concise summary with key findings.`;

    return this.llm.generateWithOllama(prompt);
  }

  private async writeAction(agent: AutonomousAgent, step: TaskStep): Promise<any> {
    const prompt = `As ${agent.name}, ${agent.role}, write content for:
${step.description}`;

    return this.llm.generateWithOllama(prompt);
  }

  private async analyzeAction(agent: AutonomousAgent, step: TaskStep): Promise<any> {
    const prompt = `As ${agent.name}, ${agent.role}, analyze the following:
${step.description}

Provide insights and recommendations.`;

    return this.llm.generateWithOllama(prompt);
  }

  private async planAction(agent: AutonomousAgent, step: TaskStep): Promise<any> {
    const prompt = `As ${agent.name}, ${agent.role}, create a plan for:
${step.description}

Provide a structured plan with priorities.`;

    return this.llm.generateWithOllama(prompt);
  }

  private async genericAction(agent: AutonomousAgent, step: TaskStep): Promise<any> {
    const prompt = `As ${agent.name}, ${agent.role}:
${step.description}

${step.params?.context || ''}`;

    return this.llm.generateWithOllama(prompt);
  }

  private addToMemory(agent: AutonomousAgent, item: Omit<MemoryItem, 'timestamp'>): void {
    const memoryItem: MemoryItem = {
      ...item,
      timestamp: Date.now()
    };

    agent.memory.recent.push(memoryItem);

    // Rotate to long-term if important enough
    if (item.importance > 0.8) {
      agent.memory.longTerm.push(memoryItem);
      
      // Trim long-term if too large
      if (agent.memory.longTerm.length > agent.memory.maxLongTerm) {
        agent.memory.longTerm.shift();
      }
    }

    // Trim recent if too large
    if (agent.memory.recent.length > agent.memory.maxRecent) {
      agent.memory.recent.shift();
    }
  }

  getAgent(agentId: string): AutonomousAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AutonomousAgent[] {
    return Array.from(this.agents.values());
  }

  getTaskQueue(): Task[] {
    return [...this.taskQueue];
  }
}

// Predictive Action Engine
export class PredictiveEngine {
  private eventBus: EventBus;
  private llm: LocalLLMManager;
  private patterns: Map<string, PredictiveAction[]> = new Map();
  private history: { input: string; action: string; timestamp: number }[] = [];

  constructor(eventBus: EventBus, llm: LocalLLMManager) {
    this.eventBus = eventBus;
    this.llm = llm;
    this.initializeDefaultPatterns();
  }

  private initializeDefaultPatterns(): void {
    this.patterns.set('calculate', [
      { type: 'calculator', confidence: 0.9, trigger: 'math' },
      { type: 'converter', confidence: 0.8, trigger: 'convert' }
    ]);

    this.patterns.set('search', [
      { type: 'web_search', confidence: 0.9, trigger: 'find' },
      { type: 'database_search', confidence: 0.8, trigger: 'search' }
    ]);

    this.patterns.set('create', [
      { type: 'document', confidence: 0.8, trigger: 'write' },
      { type: 'chart', confidence: 0.85, trigger: 'show' }
    ]);
  }

  async predictAction(input: string): Promise<PredictiveAction[]> {
    const inputLower = input.toLowerCase();
    const predictions: PredictiveAction[] = [];

    // Check pattern matches
    this.patterns.forEach((actions, category) => {
      actions.forEach(action => {
        if (inputLower.includes(action.trigger)) {
          predictions.push({
            ...action,
            suggestedInput: this.suggestInput(input, action)
          });
        }
      });
    });

    // Use LLM for more sophisticated prediction
    try {
      const prompt = `Based on user input: "${input}"

What is the most likely action the user wants to perform? Choose from:
- calculator (math calculations)
- search (find information)
- create (generate content)
- analyze (examine data)
- plan (organize tasks)

Respond with JSON: {"action": "type", "confidence": 0.0-1.0, "suggestion": "enhanced input"}`;

      const response = await this.llm.generateWithOllama(prompt);
      const match = response.match(/\{[\s\S]*\}/);

      if (match) {
        const parsed = JSON.parse(match[0]);
        predictions.push({
          type: parsed.action,
          confidence: parsed.confidence,
          trigger: 'llm',
          suggestedInput: parsed.suggestion
        });
      }
    } catch (e) {
      console.warn('LLM prediction failed:', e);
    }

    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);

    // Record in history
    if (predictions.length > 0) {
      this.history.push({
        input,
        action: predictions[0].type,
        timestamp: Date.now()
      });
    }

    return predictions.slice(0, 3);
  }

  private suggestInput(input: string, action: PredictiveAction): string {
    // Add relevant context to input based on action
    if (action.type === 'calculator' && !input.match(/[+\-*/]/)) {
      return input + ' (math)';
    }
    if (action.type === 'chart' && !input.includes('chart')) {
      return `show chart: ${input}`;
    }
    return input;
  }

  learnFromOutcome(input: string, action: string, success: boolean): void {
    if (success) {
      // Strengthen the pattern
      const key = input.toLowerCase().split(' ')[0];
      const actions = this.patterns.get(key) || [];
      
      const existing = actions.find(a => a.type === action);
      if (existing) {
        existing.confidence = Math.min(1, existing.confidence + 0.1);
      }
    }
  }

  getHistory(): typeof this.history {
    return [...this.history];
  }
}

// Context Awareness
export class ContextAwareness {
  private eventBus: EventBus;
  private currentContext: ContextData;
  private contextHistory: ContextData[] = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.currentContext = this.getDefaultContext();
    this.setupListeners();
  }

  private getDefaultContext(): ContextData {
    return {
      time: new Date().toISOString(),
      location: 'unknown',
      activity: 'idle',
      mood: 'neutral',
      recentTasks: [],
      activeNodes: 0,
      workspace: 'default'
    };
  }

  private setupListeners(): void {
    this.eventBus.on('node:created', () => {
      this.currentContext.activeNodes++;
      this.updateContext();
    });

    this.eventBus.on('node:deleted', () => {
      this.currentContext.activeNodes--;
      this.updateContext();
    });

    // Update time periodically
    setInterval(() => {
      this.currentContext.time = new Date().toISOString();
      this.updateContext();
    }, 60000);
  }

  private updateContext(): void {
    // Save to history
    this.contextHistory.push({ ...this.currentContext });
    if (this.contextHistory.length > 100) {
      this.contextHistory.shift();
    }

    this.eventBus.emit('context:updated', this.currentContext);
  }

  getContext(): ContextData {
    return { ...this.currentContext };
  }

  setContext(updates: Partial<ContextData>): void {
    this.currentContext = { ...this.currentContext, ...updates };
    this.updateContext();
  }

  getContextHistory(): ContextData[] {
    return [...this.contextHistory];
  }

  getRelevantContext(prompt: string): string {
    // Extract relevant context based on prompt
    const recentTasks = this.currentContext.recentTasks.slice(-3);
    const timeOfDay = new Date().getHours();
    
    let context = '';
    
    if (recentTasks.length > 0) {
      context += `Recent tasks: ${recentTasks.join(', ')}. `;
    }
    
    if (timeOfDay < 12) {
      context += 'It is morning. ';
    } else if (timeOfDay < 18) {
      context += 'It is afternoon. ';
    } else {
      context += 'It is evening. ';
    }
    
    if (this.currentContext.activeNodes > 0) {
      context += `You have ${this.currentContext.activeNodes} active nodes. `;
    }
    
    return context;
  }
}

export interface ContextData {
  time: string;
  location: string;
  activity: string;
  mood: string;
  recentTasks: string[];
  activeNodes: number;
  workspace: string;
}
