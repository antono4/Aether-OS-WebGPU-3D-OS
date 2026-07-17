/**
 * Aether OS - Multi-Modal AI
 * Vision, Audio, and Cross-modal AI capabilities
 */

import { EventBus } from '../../core/EventBus';

export interface ImageAnalysis {
  description: string;
  tags: string[];
  objects: DetectedObject[];
  faces: DetectedFace[];
  colors: ColorInfo[];
  text?: string;
  confidence: number;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
  landmarks?: { [key: string]: { x: number; y: number } };
  emotion?: string;
  age?: number;
  gender?: string;
}

export interface ColorInfo {
  hex: string;
  percentage: number;
  name: string;
}

export interface AudioAnalysis {
  transcript: string;
  language: string;
  confidence: number;
  words: WordTiming[];
  sentiment: SentimentInfo;
  topics: string[];
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SentimentInfo {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface VideoAnalysis {
  frames: VideoFrame[];
  scenes: Scene[];
  summary: string;
}

export interface VideoFrame {
  timestamp: number;
  imageAnalysis: ImageAnalysis;
}

export interface Scene {
  start: number;
  end: number;
  description: string;
  keyFrame: number;
}

export interface CrossModalResult {
  query: string;
  images?: ImageAnalysis[];
  audio?: AudioAnalysis[];
  video?: VideoAnalysis;
  combined: string;
  relevance: number;
}

export class VisionAI {
  private eventBus: EventBus;
  private model: any = null;
  private isLoaded: boolean = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async loadModel(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // Load TensorFlow.js or similar vision model
      // For demo, we'll simulate model loading
      console.log('👁️ Loading vision model...');
      
      // In production, use:
      // this.model = await tf.loadGraphModel('path/to/model.json');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      this.isLoaded = true;
      console.log('👁️ Vision model loaded');
    } catch (e) {
      console.error('Failed to load vision model:', e);
    }
  }

  async analyzeImage(imageData: ImageData | HTMLImageElement | HTMLCanvasElement): Promise<ImageAnalysis> {
    await this.loadModel();

    // Simulated analysis - in production, run through ML model
    const canvas = this.imageToCanvas(imageData);
    const ctx = canvas.getContext('2d')!;
    const imageDataResult = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Extract dominant colors
    const colors = this.extractColors(imageDataResult);
    
    // Detect objects (simulated)
    const objects = this.simulateObjectDetection(canvas);
    
    // Detect faces (simulated)
    const faces = this.simulateFaceDetection(canvas);
    
    // OCR (simulated)
    const text = Math.random() > 0.5 ? 'Sample text from image' : undefined;

    return {
      description: this.generateDescription(objects, colors),
      tags: this.generateTags(objects, colors),
      objects,
      faces,
      colors,
      text,
      confidence: 0.85 + Math.random() * 0.1
    };
  }

  private imageToCanvas(image: ImageData | HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    if (image instanceof HTMLCanvasElement) {
      return image;
    }
    
    const img = image instanceof ImageData ? this.imageDataToImage(image) : image;
    canvas.width = img.width || 224;
    canvas.height = img.height || 224;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    return canvas;
  }

  private imageDataToImage(imageData: ImageData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d')!.putImageData(imageData, 0, 0);
    return canvas;
  }

  private extractColors(imageData: ImageData): ColorInfo[] {
    const colorCounts: Map<string, number> = new Map();
    const data = imageData.data;
    
    // Sample pixels
    for (let i = 0; i < data.length; i += 16) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }
    
    const total = Array.from(colorCounts.values()).reduce((a, b) => a + b, 0);
    
    return Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hex, count]) => ({
        hex,
        percentage: (count / total) * 100,
        name: this.colorToName(hex)
      }));
  }

  private colorToName(hex: string): string {
    const colors: [string, string][] = [
      ['#000000', 'Black'], ['#808080', 'Gray'], ['#FFFFFF', 'White'],
      ['#FF0000', 'Red'], ['#00FF00', 'Green'], ['#0000FF', 'Blue'],
      ['#FFFF00', 'Yellow'], ['#FF00FF', 'Magenta'], ['#00FFFF', 'Cyan'],
      ['#FFA500', 'Orange'], ['#800080', 'Purple'], ['#008000', 'Dark Green'],
      ['#000080', 'Navy'], ['#800000', 'Maroon'], ['#FFC0CB', 'Pink']
    ];
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    let closest = colors[0][1];
    let minDist = Infinity;
    
    for (const [cHex, name] of colors) {
      const cR = parseInt(cHex.slice(1, 3), 16);
      const cG = parseInt(cHex.slice(3, 5), 16);
      const cB = parseInt(cHex.slice(5, 7), 16);
      const dist = Math.sqrt((r - cR) ** 2 + (g - cG) ** 2 + (b - cB) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = name;
      }
    }
    
    return closest;
  }

  private simulateObjectDetection(canvas: HTMLCanvasElement): DetectedObject[] {
    const objects = ['person', 'laptop', 'phone', 'book', 'cup', 'chair', 'desk'];
    const count = Math.floor(Math.random() * 3) + 1;
    const detected: DetectedObject[] = [];
    
    for (let i = 0; i < count; i++) {
      detected.push({
        label: objects[Math.floor(Math.random() * objects.length)],
        confidence: 0.7 + Math.random() * 0.3,
        boundingBox: {
          x: Math.random() * (canvas.width - 100),
          y: Math.random() * (canvas.height - 100),
          width: 50 + Math.random() * 100,
          height: 50 + Math.random() * 100
        }
      });
    }
    
    return detected;
  }

  private simulateFaceDetection(canvas: HTMLCanvasElement): DetectedFace[] {
    // Simulate 0-2 faces
    const count = Math.random() > 0.6 ? Math.floor(Math.random() * 2) + 1 : 0;
    const emotions = ['happy', 'neutral', 'surprised', 'sad', 'angry'];
    const detected: DetectedFace[] = [];
    
    for (let i = 0; i < count; i++) {
      detected.push({
        boundingBox: {
          x: Math.random() * (canvas.width - 80),
          y: Math.random() * (canvas.height - 80),
          width: 60 + Math.random() * 40,
          height: 60 + Math.random() * 40
        },
        emotion: emotions[Math.floor(Math.random() * emotions.length)],
        age: 20 + Math.floor(Math.random() * 50),
        gender: Math.random() > 0.5 ? 'male' : 'female'
      });
    }
    
    return detected;
  }

  private generateDescription(objects: DetectedObject[], colors: ColorInfo[]): string {
    if (objects.length === 0) return 'A colorful image';
    
    const mainObject = objects[0].label;
    const mainColor = colors[0]?.name || 'colorful';
    
    return `A ${mainColor.toLowerCase()} image featuring a ${mainObject}${objects.length > 1 ? ` and ${objects.length - 1} other objects` : ''}.`;
  }

  private generateTags(objects: DetectedObject[], colors: ColorInfo[]): string[] {
    const tags = objects.map(o => o.label);
    colors.slice(0, 2).forEach(c => tags.push(c.name.toLowerCase()));
    return [...new Set(tags)].slice(0, 10);
  }

  async detectObjects(imageData: ImageData): Promise<DetectedObject[]> {
    const analysis = await this.analyzeImage(imageData);
    return analysis.objects;
  }

  async detectFaces(imageData: ImageData): Promise<DetectedFace[]> {
    const analysis = await this.analyzeImage(imageData);
    return analysis.faces;
  }

  async extractText(imageData: ImageData): Promise<string | undefined> {
    const analysis = await this.analyzeImage(imageData);
    return analysis.text;
  }
}

export class AudioAI {
  private eventBus: EventBus;
  private recognition: any = null;
  private synthesis: SpeechSynthesis;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.synthesis = window.speechSynthesis;
    this.initRecognition();
  }

  private initRecognition(): void {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        this.eventBus.emit('audio:transcript', {
          transcript: result[0].transcript,
          isFinal: result.isFinal,
          confidence: result[0].confidence
        });
      };

      this.recognition.onerror = (e: any) => {
        this.eventBus.emit('audio:error', e.error);
      };
    }
  }

  async analyzeAudio(audioData: AudioBuffer): Promise<AudioAnalysis> {
    // Simulated audio analysis
    const words: WordTiming[] = [];
    const transcript = 'Sample spoken text with analysis';
    
    // Generate word timings
    let time = 0;
    transcript.split(' ').forEach(word => {
      const duration = word.length * 0.1 + Math.random() * 0.2;
      words.push({
        word,
        start: time,
        end: time + duration,
        confidence: 0.8 + Math.random() * 0.2
      });
      time += duration + 0.1;
    });

    return {
      transcript,
      language: 'en-US',
      confidence: 0.9,
      words,
      sentiment: {
        label: Math.random() > 0.5 ? 'positive' : Math.random() > 0.5 ? 'neutral' : 'negative',
        score: Math.random()
      },
      topics: this.extractTopics(transcript)
    };
  }

  private extractTopics(text: string): string[] {
    const topicKeywords: { [key: string]: string[] } = {
      'technology': ['computer', 'software', 'digital', 'tech', 'code'],
      'business': ['meeting', 'project', 'deadline', 'budget', 'team'],
      'personal': ['family', 'home', 'weekend', 'vacation', 'friend'],
      'health': ['exercise', 'diet', 'sleep', 'stress', 'wellness'],
      'creative': ['design', 'art', 'music', 'creative', 'write']
    };

    const textLower = text.toLowerCase();
    const topics: string[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => textLower.includes(k))) {
        topics.push(topic);
      }
    }

    return topics.length > 0 ? topics : ['general'];
  }

  startListening(): void {
    if (this.recognition) {
      this.recognition.start();
      console.log('🎤 Started listening');
    }
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
      console.log('🎤 Stopped listening');
    }
  }

  async speak(text: string, options?: { rate?: number; pitch?: number; voice?: SpeechSynthesisVoice }): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      if (options?.rate) utterance.rate = options.rate;
      if (options?.pitch) utterance.pitch = options.pitch;
      if (options?.voice) utterance.voice = options.voice;
      
      utterance.onend = () => resolve();
      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    this.synthesis.cancel();
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }
}

export class CrossModalAI {
  private vision: VisionAI;
  private audio: AudioAI;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.vision = new VisionAI(eventBus);
    this.audio = new AudioAI(eventBus);
  }

  async analyzeQueryWithImages(query: string, images: (ImageData | HTMLImageElement)[]): Promise<CrossModalResult> {
    const imageAnalyses: ImageAnalysis[] = [];
    
    for (const image of images) {
      const analysis = await this.vision.analyzeImage(image);
      imageAnalyses.push(analysis);
    }

    const combined = this.generateCrossModalResponse(query, imageAnalyses);

    return {
      query,
      images: imageAnalyses,
      combined,
      relevance: 0.8 + Math.random() * 0.2
    };
  }

  async analyzeQueryWithAudio(query: string, audio: AudioBuffer): Promise<CrossModalResult> {
    const audioAnalysis = await this.audio.analyzeAudio(audio);

    const combined = `Based on your audio analysis: ${audioAnalysis.transcript}. ` +
      `The speaker expressed a ${audioAnalysis.sentiment.label} sentiment with topics: ${audioAnalysis.topics.join(', ')}.`;

    return {
      query,
      audio: [audioAnalysis],
      combined,
      relevance: audioAnalysis.confidence
    };
  }

  private generateCrossModalResponse(query: string, images: ImageAnalysis[]): string {
    const allObjects = images.flatMap(i => i.objects.map(o => o.label));
    const objectCounts = new Map<string, number>();
    allObjects.forEach(o => objectCounts.set(o, (objectCounts.get(o) || 0) + 1));
    
    const topObjects = Array.from(objectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);

    return `Based on the ${images.length} image(s), I found: ${topObjects.join(', ') || 'various objects'}. ` +
      `The images have a ${images[0]?.colors[0]?.name.toLowerCase() || 'varied'} color palette. ` +
      `This relates to your query about "${query}".`;
  }

  async searchImagesByConcept(concept: string, imageLibrary: (ImageData | HTMLImageElement)[]): Promise<ImageAnalysis[]> {
    const scored: { analysis: ImageAnalysis; score: number }[] = [];
    
    for (const image of imageLibrary) {
      const analysis = await this.vision.analyzeImage(image);
      const score = this.calculateConceptMatch(concept, analysis);
      scored.push({ analysis, score });
    }
    
    return scored
      .filter(s => s.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .map(s => s.analysis);
  }

  private calculateConceptMatch(concept: string, analysis: ImageAnalysis): number {
    const conceptLower = concept.toLowerCase();
    const description = analysis.description.toLowerCase();
    const tags = analysis.tags.join(' ').toLowerCase();
    const objects = analysis.objects.map(o => o.label).join(' ').toLowerCase();
    
    const combined = description + ' ' + tags + ' ' + objects;
    
    if (combined.includes(conceptLower)) return 1;
    
    // Simple fuzzy matching
    let match = 0;
    for (const word of conceptLower.split(' ')) {
      if (combined.includes(word)) match += 0.5;
    }
    
    return Math.min(match, 1);
  }
}
