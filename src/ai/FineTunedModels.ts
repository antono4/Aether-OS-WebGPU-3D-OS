/**
 * Aether OS - Fine-Tuned Models
 * Custom model training and management
 */

import { EventBus } from '../core/EventBus';
import { storage } from '../storage/PersistentStorage';

export interface FineTunedModel {
  id: string;
  name: string;
  description: string;
  baseModel: string;
  version: string;
  status: 'training' | 'ready' | 'failed' | 'deploying';
  progress: number;
  metrics: ModelMetrics;
  config: ModelConfig;
  createdAt: number;
  updatedAt: number;
  trainedAt?: number;
  fileSize?: number;
  downloads: number;
}

export interface ModelMetrics {
  loss: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  perplexity?: number;
  bleuScore?: number;
}

export interface ModelConfig {
  learningRate: number;
  batchSize: number;
  epochs: number;
  warmupSteps: number;
  maxSeqLength: number;
  optimizer: string;
  scheduler: string;
  regularization: {
    dropout: number;
    weightDecay: number;
    loraRank?: number;
  };
}

export interface TrainingJob {
  id: string;
  modelId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  estimatedTimeRemaining?: number;
  logs: TrainingLog[];
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface TrainingLog {
  timestamp: number;
  epoch: number;
  step: number;
  loss: number;
  metrics: Record<string, number>;
  message: string;
}

export interface TrainingData {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'chat' | 'instruction' | 'classification' | 'jsonl';
  fileSize: number;
  samples: number;
  createdAt: number;
  format: 'jsonl' | 'csv' | 'parquet';
}

export interface DatasetSplit {
  name: 'train' | 'validation' | 'test';
  samples: number;
  percentage: number;
}

export interface EvaluationResult {
  modelId: string;
  timestamp: number;
  dataset: string;
  metrics: ModelMetrics;
  testCases: TestCase[];
  passed: boolean;
  score: number;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed: boolean;
  latency: number;
}

export class FineTunedModelManager {
  private eventBus: EventBus;
  private models: Map<string, FineTunedModel> = new Map();
  private trainingJobs: Map<string, TrainingJob> = new Map();
  private trainingData: Map<string, TrainingData> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.loadModels();
    this.initializeDemoModels();
  }

  private async loadModels(): Promise<void> {
    try {
      const stored = await storage.getAll<FineTunedModel>('fine_tuned_models');
      stored.forEach((m: FineTunedModel) => this.models.set(m.id, m));

      const storedJobs = await storage.getAll<TrainingJob>('training_jobs');
      storedJobs.forEach((j: TrainingJob) => this.trainingJobs.set(j.id, j));

      console.log(`🤖 Loaded ${this.models.size} fine-tuned models`);
    } catch (e) {
      console.error('Failed to load models:', e);
    }
  }

  private initializeDemoModels(): void {
    // Demo models
    const demoModels: FineTunedModel[] = [
      {
        id: 'model-code-assistant',
        name: 'Code Assistant Pro',
        description: 'Specialized in code completion and debugging',
        baseModel: 'llama3',
        version: '1.0.0',
        status: 'ready',
        progress: 100,
        metrics: { loss: 0.15, accuracy: 0.94, precision: 0.92, recall: 0.91, f1Score: 0.915 },
        config: {
          learningRate: 0.0001,
          batchSize: 4,
          epochs: 3,
          warmupSteps: 100,
          maxSeqLength: 2048,
          optimizer: 'adamw',
          scheduler: 'cosine',
          regularization: { dropout: 0.1, weightDecay: 0.01 }
        },
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now() - 86400000 * 7,
        trainedAt: Date.now() - 86400000 * 7,
        fileSize: 4500000000,
        downloads: 1250
      },
      {
        id: 'model-writer',
        name: 'Creative Writer',
        description: 'Enhanced creative writing and storytelling',
        baseModel: 'mistral',
        version: '1.2.0',
        status: 'ready',
        progress: 100,
        metrics: { loss: 0.22, accuracy: 0.88, precision: 0.87, recall: 0.89, f1Score: 0.88, bleuScore: 32.5 },
        config: {
          learningRate: 0.00005,
          batchSize: 2,
          epochs: 5,
          warmupSteps: 50,
          maxSeqLength: 4096,
          optimizer: 'adamw',
          scheduler: 'linear',
          regularization: { dropout: 0.15, weightDecay: 0.01 }
        },
        createdAt: Date.now() - 86400000 * 60,
        updatedAt: Date.now() - 86400000 * 14,
        trainedAt: Date.now() - 86400000 * 14,
        fileSize: 7800000000,
        downloads: 890
      }
    ];

    demoModels.forEach(m => {
      if (!this.models.has(m.id)) {
        this.models.set(m.id, m);
      }
    });
  }

  async createModel(data: {
    name: string;
    description: string;
    baseModel: string;
    config?: Partial<ModelConfig>;
  }): Promise<FineTunedModel> {
    const model: FineTunedModel = {
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      baseModel: data.baseModel,
      version: '0.0.1',
      status: 'training',
      progress: 0,
      metrics: { loss: 0, accuracy: 0, precision: 0, recall: 0, f1Score: 0 },
      config: {
        learningRate: data.config?.learningRate ?? 0.0001,
        batchSize: data.config?.batchSize ?? 4,
        epochs: data.config?.epochs ?? 3,
        warmupSteps: data.config?.warmupSteps ?? 100,
        maxSeqLength: data.config?.maxSeqLength ?? 2048,
        optimizer: data.config?.optimizer ?? 'adamw',
        scheduler: data.config?.scheduler ?? 'cosine',
        regularization: data.config?.regularization ?? { dropout: 0.1, weightDecay: 0.01 }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      downloads: 0
    };

    this.models.set(model.id, model);
    await storage.put('fine_tuned_models', model);

    this.eventBus.emit('model:created', model);
    console.log(`🤖 Created model: ${model.name}`);

    return model;
  }

  async startTraining(modelId: string, trainingDataId: string): Promise<TrainingJob> {
    const model = this.models.get(modelId);
    if (!model) throw new Error('Model not found');

    const job: TrainingJob = {
      id: `job-${Date.now()}`,
      modelId,
      status: 'queued',
      progress: 0,
      currentEpoch: 0,
      totalEpochs: model.config.epochs,
      currentStep: 0,
      totalSteps: 1000,
      logs: [],
      startedAt: Date.now()
    };

    this.trainingJobs.set(job.id, job);
    await storage.put('training_jobs', job);

    // Simulate training progress
    this.simulateTraining(job);

    this.eventBus.emit('training:started', job);
    console.log(`🚀 Started training job: ${job.id}`);

    return job;
  }

  private async simulateTraining(job: TrainingJob): Promise<void> {
    job.status = 'running';

    for (let epoch = 1; epoch <= job.totalEpochs; epoch++) {
      job.currentEpoch = epoch;

      for (let step = 1; step <= job.totalSteps / job.totalEpochs; step++) {
        job.currentStep = step;
        job.progress = ((epoch - 1) * (job.totalSteps / job.totalEpochs) + step) / job.totalSteps * 100;

        // Simulate metrics
        const baseLoss = 2.5 - (job.progress / 100) * 2.3;
        const loss = Math.max(0.1, baseLoss + (Math.random() - 0.5) * 0.1);

        job.logs.push({
          timestamp: Date.now(),
          epoch,
          step,
          loss,
          metrics: {
            accuracy: Math.min(0.99, (job.progress / 100) * 0.95 + Math.random() * 0.05),
            perplexity: Math.exp(loss)
          },
          message: `Epoch ${epoch}, Step ${step}: loss=${loss.toFixed(4)}`
        });

        await new Promise(r => setTimeout(r, 50));
      }
    }

    // Complete training
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = Date.now();

    // Update model
    const model = this.models.get(job.modelId);
    if (model) {
      model.status = 'ready';
      model.progress = 100;
      model.version = this.bumpVersion(model.version);
      model.metrics = {
        loss: job.logs[job.logs.length - 1]?.loss || 0.15,
        accuracy: 0.92,
        precision: 0.91,
        recall: 0.90,
        f1Score: 0.905
      };
      model.trainedAt = Date.now();
      model.updatedAt = Date.now();
      await storage.put('fine_tuned_models', model);
    }

    this.eventBus.emit('training:completed', job);
    console.log(`✅ Training completed: ${job.id}`);
  }

  private bumpVersion(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  async cancelTraining(jobId: string): Promise<void> {
    const job = this.trainingJobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'failed';
      job.error = 'Canceled by user';
      this.eventBus.emit('training:canceled', job);
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    this.models.delete(modelId);
    await storage.delete('fine_tuned_models', { id: modelId } as any);
    this.eventBus.emit('model:deleted', { modelId });
  }

  async uploadTrainingData(data: {
    name: string;
    description: string;
    type: TrainingData['type'];
    content: string;
  }): Promise<TrainingData> {
    const samples = this.countSamples(data.content, data.type);
    
    const trainingData: TrainingData = {
      id: `data-${Date.now()}`,
      name: data.name,
      description: data.description,
      type: data.type,
      fileSize: data.content.length,
      samples,
      createdAt: Date.now(),
      format: 'jsonl'
    };

    this.trainingData.set(trainingData.id, trainingData);
    console.log(`📚 Uploaded training data: ${trainingData.name} (${samples} samples)`);

    return trainingData;
  }

  private countSamples(content: string, type: TrainingData['type']): number {
    switch (type) {
      case 'jsonl':
        return content.split('\n').filter(l => l.trim()).length;
      case 'chat':
        return Math.floor(content.split('###').length / 2);
      default:
        return Math.floor(content.split('.').length / 5);
    }
  }

  async evaluateModel(modelId: string, testData: TestCase[]): Promise<EvaluationResult> {
    const model = this.models.get(modelId);
    if (!model) throw new Error('Model not found');

    const results: TestCase[] = [];

    for (const test of testData) {
      // Simulate inference
      await new Promise(r => setTimeout(r, 100));

      results.push({
        ...test,
        actualOutput: `Simulated output for: ${test.input.substring(0, 50)}...`,
        passed: Math.random() > 0.2,
        latency: 50 + Math.random() * 100
      });
    }

    const passed = results.filter(r => r.passed).length;
    const score = (passed / results.length) * 100;

    const result: EvaluationResult = {
      modelId,
      timestamp: Date.now(),
      dataset: 'test_set',
      metrics: {
        loss: 0,
        accuracy: score / 100,
        precision: score / 100 * 0.98,
        recall: score / 100 * 0.96,
        f1Score: score / 100 * 0.97
      },
      testCases: results,
      passed: score >= 80,
      score
    };

    this.eventBus.emit('model:evaluated', result);
    console.log(`📊 Evaluation complete: ${score.toFixed(1)}% passed`);

    return result;
  }

  async deployModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) throw new Error('Model not found');

    model.status = 'deploying';
    model.updatedAt = Date.now();
    await storage.put('fine_tuned_models', model);

    // Simulate deployment
    await new Promise(r => setTimeout(r, 2000));

    model.status = 'ready';
    model.updatedAt = Date.now();
    await storage.put('fine_tuned_models', model);

    this.eventBus.emit('model:deployed', { modelId });
    console.log(`🚀 Model deployed: ${model.name}`);
  }

  getModels(): FineTunedModel[] {
    return Array.from(this.models.values());
  }

  getModel(modelId: string): FineTunedModel | undefined {
    return this.models.get(modelId);
  }

  getTrainingJob(jobId: string): TrainingJob | undefined {
    return this.trainingJobs.get(jobId);
  }

  getTrainingData(): TrainingData[] {
    return Array.from(this.trainingData.values());
  }

  getAvailableBaseModels(): { id: string; name: string; size: string }[] {
    return [
      { id: 'llama3', name: 'Llama 3 8B', size: '8B' },
      { id: 'mistral', name: 'Mistral 7B', size: '7B' },
      { id: 'phi3', name: 'Phi-3 Mini', size: '3.8B' },
      { id: 'gemma', name: 'Gemma 2B', size: '2B' }
    ];
  }
}

// LoRA Configuration for efficient fine-tuning
export interface LoRAConfig {
  rank: number;
  alpha: number;
  targetModules: string[];
  dropout: number;
  bias: 'none' | 'all' | 'lora_only';
}

export class LoRAManager {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  createLoRAConfig(preset: 'low' | 'medium' | 'high'): LoRAConfig {
    const configs: Record<string, LoRAConfig> = {
      low: { rank: 8, alpha: 16, targetModules: ['q_proj', 'v_proj'], dropout: 0.05, bias: 'none' },
      medium: { rank: 32, alpha: 64, targetModules: ['q_proj', 'k_proj', 'v_proj', 'o_proj'], dropout: 0.1, bias: 'none' },
      high: { rank: 64, alpha: 128, targetModules: ['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'], dropout: 0.1, bias: 'none' }
    };

    return configs[preset];
  }

  estimateLoRASize(rank: number, layers: number): number {
    // Approximate LoRA parameter count
    // 4 * rank * (embedding_dim) for Q, K, V projections
    const embeddingDim = 4096; // For 7B models
    return (4 * rank * embeddingDim * layers) / 8 / 1024 / 1024; // MB
  }
}
