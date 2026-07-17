/**
 * Aether OS - AI Agent Delegation System
 * Task distribution and agent orchestration
 */

import { EventBus, Events } from '../core/EventBus';
import { AIIntegration } from '../intelligence/AIIntegration';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: string[];
  status: AgentStatus;
  currentTask?: Task;
  completedTasks: number;
  createdAt: number;
}

export type AgentType = 'coder' | 'designer' | 'researcher' | 'planner' | 'general';
export type AgentStatus = 'idle' | 'working' | 'paused' | 'offline';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedAgent?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: TaskResult;
  dependencies?: string[];
  subtasks?: Task[];
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
  artifacts?: Artifact[];
}

export interface Artifact {
  id: string;
  name: string;
  type: 'code' | 'design' | 'document' | 'data';
  content: string;
  createdAt: number;
}

export interface DelegationPolicy {
  autoAssign: boolean;
  loadBalancing: 'round_robin' | 'capability_match' | 'least_loaded';
  maxConcurrentTasks: number;
  timeout: number;
  retryOnFailure: boolean;
  maxRetries: number;
}

export class AgentDelegation {
  private eventBus: EventBus;
  private aiIntegration: AIIntegration;
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private policy: DelegationPolicy;
  private taskQueue: string[] = [];
  private agentTaskCounts: Map<string, number> = new Map();

  constructor(eventBus: EventBus, aiIntegration: AIIntegration, policy?: Partial<DelegationPolicy>) {
    this.eventBus = eventBus;
    this.aiIntegration = aiIntegration;
    this.policy = {
      autoAssign: policy?.autoAssign ?? true,
      loadBalancing: policy?.loadBalancing ?? 'capability_match',
      maxConcurrentTasks: policy?.maxConcurrentTasks ?? 5,
      timeout: policy?.timeout ?? 300000, // 5 minutes
      retryOnFailure: policy?.retryOnFailure ?? true,
      maxRetries: policy?.maxRetries ?? 3
    };

    this.initializeDefaultAgents();
    this.setupEventListeners();
  }

  private initializeDefaultAgents(): void {
    // Create default AI agents
    const defaultAgents: Omit<Agent, 'currentTask' | 'completedTasks' | 'createdAt'>[] = [
      {
        id: 'agent-coder',
        name: 'Code Agent',
        type: 'coder',
        capabilities: ['write_code', 'debug', 'refactor', 'review_code', 'test'],
        status: 'idle'
      },
      {
        id: 'agent-designer',
        name: 'Design Agent',
        type: 'designer',
        capabilities: ['ui_design', 'ux_research', 'prototype', 'visual_design'],
        status: 'idle'
      },
      {
        id: 'agent-researcher',
        name: 'Research Agent',
        type: 'researcher',
        capabilities: ['web_search', 'data_analysis', 'summarize', 'fact_check'],
        status: 'idle'
      },
      {
        id: 'agent-planner',
        name: 'Planning Agent',
        type: 'planner',
        capabilities: ['plan', 'organize', 'prioritize', 'coordinate', 'schedule'],
        status: 'idle'
      },
      {
        id: 'agent-general',
        name: 'General Assistant',
        type: 'general',
        capabilities: ['general', 'answer', 'explain', 'help', 'assist'],
        status: 'idle'
      }
    ];

    defaultAgents.forEach(agentData => {
      const agent: Agent = {
        ...agentData,
        currentTask: undefined,
        completedTasks: 0,
        createdAt: Date.now()
      };
      this.agents.set(agent.id, agent);
      this.agentTaskCounts.set(agent.id, 0);
    });
  }

  private setupEventListeners(): void {
    this.eventBus.on(Events.INTENT_RECEIVED, (data: { input: string }) => {
      this.handleIntent(data.input);
    });
  }

  /**
   * Create a new task
   */
  createTask(data: {
    title: string;
    description: string;
    priority?: TaskPriority;
    dependencies?: string[];
  }): Task {
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      description: data.description,
      priority: data.priority || 'medium',
      status: 'pending',
      createdAt: Date.now(),
      dependencies: data.dependencies
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task.id);
    this.sortQueue();

    this.eventBus.emit('agent:task-created', { task });
    
    if (this.policy.autoAssign) {
      this.processQueue();
    }

    return task;
  }

  /**
   * Assign a task to an agent
   */
  assignTask(taskId: string, agentId?: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return false;

    // Check dependencies
    if (task.dependencies) {
      const depsComplete = task.dependencies.every(depId => {
        const dep = this.tasks.get(depId);
        return dep?.status === 'completed';
      });
      if (!depsComplete) return false;
    }

    // Find best agent if not specified
    const targetAgent = agentId 
      ? this.agents.get(agentId) 
      : this.findBestAgent(task);

    if (!targetAgent || targetAgent.status === 'offline') return false;

    // Assign task
    task.assignedAgent = targetAgent.id;
    task.status = 'assigned';
    task.startedAt = Date.now();
    targetAgent.currentTask = task;
    targetAgent.status = 'working';

    this.eventBus.emit('agent:task-assigned', { task, agent: targetAgent });

    // Execute task
    this.executeTask(task, targetAgent);

    return true;
  }

  /**
   * Find the best agent for a task
   */
  private findBestAgent(task: Task): Agent | undefined {
    const availableAgents = Array.from(this.agents.values())
      .filter(a => a.status === 'idle' || a.status === 'paused');

    if (availableAgents.length === 0) return undefined;

    switch (this.policy.loadBalancing) {
      case 'round_robin':
        return this.roundRobinSelect(availableAgents);
      case 'capability_match':
        return this.capabilityMatchSelect(task, availableAgents);
      case 'least_loaded':
        return this.leastLoadedSelect(availableAgents);
      default:
        return availableAgents[0];
    }
  }

  private roundRobinSelect(agents: Agent[]): Agent {
    // Simple round-robin based on completed tasks
    return agents.reduce((prev, curr) => 
      curr.completedTasks < prev.completedTasks ? curr : prev
    );
  }

  private capabilityMatchSelect(task: Task, agents: Agent[]): Agent {
    // Match based on task description keywords
    const taskKeywords = task.description.toLowerCase().split(/\s+/);
    
    let bestAgent = agents[0];
    let bestScore = 0;

    for (const agent of agents) {
      let score = 0;
      for (const keyword of taskKeywords) {
        if (agent.capabilities.some(cap => 
          cap.toLowerCase().includes(keyword) || keyword.includes(cap.toLowerCase())
        )) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  private leastLoadedSelect(agents: Agent[]): Agent {
    return agents.reduce((prev, curr) => 
      (this.agentTaskCounts.get(curr.id) || 0) < (this.agentTaskCounts.get(prev.id) || 0) 
        ? curr : prev
    );
  }

  /**
   * Execute a task using AI
   */
  private async executeTask(task: Task, agent: Agent): Promise<void> {
    task.status = 'in_progress';
    this.eventBus.emit('agent:task-started', { task, agent });

    try {
      const prompt = this.buildTaskPrompt(task, agent);
      const response = await this.aiIntegration.chat(prompt);

      const result: TaskResult = {
        success: true,
        output: response.content,
        artifacts: this.extractArtifacts(response.content, agent.type)
      };

      this.completeTask(task.id, result);
    } catch (error) {
      const result: TaskResult = {
        success: false,
        error: String(error)
      };

      if (this.policy.retryOnFailure) {
        this.retryTask(task.id);
      } else {
        this.completeTask(task.id, result);
      }
    }
  }

  private buildTaskPrompt(task: Task, agent: Agent): string {
    return `You are ${agent.name}, a specialized AI agent.

Task: ${task.title}
Description: ${task.description}
Priority: ${task.priority}

Your capabilities: ${agent.capabilities.join(', ')}

Please execute this task and provide:
1. The result/output
2. Any artifacts you created
3. Summary of what you did

Be thorough but concise.`;
  }

  private extractArtifacts(content: string, agentType: AgentType): Artifact[] {
    const artifacts: Artifact[] = [];
    
    // Simple extraction - in production would use more sophisticated parsing
    const codeBlocks = content.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      codeBlocks.forEach((block, i) => {
        artifacts.push({
          id: `artifact-${Date.now()}-${i}`,
          name: `Code Block ${i + 1}`,
          type: 'code',
          content: block,
          createdAt: Date.now()
        });
      });
    }

    return artifacts;
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, result: TaskResult): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = result.success ? 'completed' : 'failed';
    task.completedAt = Date.now();
    task.result = result;

    const agent = task.assignedAgent ? this.agents.get(task.assignedAgent) : undefined;
    if (agent) {
      agent.currentTask = undefined;
      agent.status = 'idle';
      agent.completedTasks++;
      this.agentTaskCounts.set(agent.id, (this.agentTaskCounts.get(agent.id) || 0) - 1);
    }

    this.eventBus.emit('agent:task-completed', { task, result });
    this.processQueue();
  }

  /**
   * Retry a failed task
   */
  private retryTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const retryCount = (task.result as any)?._retryCount || 0;
    
    if (retryCount < this.policy.maxRetries) {
      task.status = 'pending';
      (task.result as any)._retryCount = retryCount + 1;
      this.taskQueue.push(taskId);
      this.sortQueue();
      this.processQueue();
    } else {
      const result: TaskResult = {
        success: false,
        error: 'Max retries exceeded'
      };
      this.completeTask(taskId, result);
    }
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const activeTasks = Array.from(this.tasks.values())
        .filter(t => t.status === 'in_progress' || t.status === 'assigned').length;

      if (activeTasks >= this.policy.maxConcurrentTasks) break;

      const taskId = this.taskQueue.shift();
      if (taskId) {
        this.assignTask(taskId);
      }
    }
  }

  private sortQueue(): void {
    const priorityOrder: Record<TaskPriority, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3
    };

    this.taskQueue.sort((a, b) => {
      const taskA = this.tasks.get(a);
      const taskB = this.tasks.get(b);
      if (!taskA || !taskB) return 0;
      return priorityOrder[taskA.priority] - priorityOrder[taskB.priority];
    });
  }

  /**
   * Handle user intent and create tasks
   */
  private handleIntent(input: string): void {
    // Analyze intent and create appropriate tasks
    const task = this.createTask({
      title: `Handle: ${input.substring(0, 50)}...`,
      description: input,
      priority: 'medium'
    });

    this.eventBus.emit('agent:intentdelegated', { input, taskId: task.id });
  }

  // Getters
  getAgents(): Agent[] { return Array.from(this.agents.values()); }
  getAgent(id: string): Agent | undefined { return this.agents.get(id); }
  getTasks(): Task[] { return Array.from(this.tasks.values()); }
  getTask(id: string): Task | undefined { return this.tasks.get(id); }
  getQueue(): Task[] { return this.taskQueue.map(id => this.tasks.get(id)!); }
  getPolicy(): DelegationPolicy { return { ...this.policy }; }

  // Agent Management
  addAgent(agent: Omit<Agent, 'currentTask' | 'completedTasks' | 'createdAt'>): Agent {
    const newAgent: Agent = {
      ...agent,
      currentTask: undefined,
      completedTasks: 0,
      createdAt: Date.now()
    };
    this.agents.set(newAgent.id, newAgent);
    this.agentTaskCounts.set(newAgent.id, 0);
    return newAgent;
  }

  removeAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  updateAgentStatus(id: string, status: AgentStatus): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    agent.status = status;
    return true;
  }

  // Policy Management
  updatePolicy(policy: Partial<DelegationPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }
}
