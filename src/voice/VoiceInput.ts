/**
 * Aether OS - Voice Input
 * Speech recognition with Web Speech API
 */

import { EventBus, Events } from '../core/EventBus';

export interface VoiceConfig {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class VoiceInput {
  private eventBus: EventBus;
  private recognition: any = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private config: VoiceConfig;
  private onTranscriptCallback?: (result: SpeechResult) => void;

  constructor(eventBus?: EventBus, config?: VoiceConfig) {
    this.eventBus = eventBus || new EventBus();
    this.config = {
      lang: config?.lang || 'en-US',
      continuous: config?.continuous ?? true,
      interimResults: config?.interimResults ?? true,
      maxAlternatives: config?.maxAlternatives ?? 1
    };
    this.checkSupport();
  }

  private checkSupport(): void {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      this.recognition = new SpeechRecognitionAPI();
      this.isSupported = true;
      this.setupRecognition();
      console.log('🎤 Voice input supported');
    } else {
      console.warn('⚠️ Speech recognition not supported');
      this.isSupported = false;
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.lang = this.config.lang!;
    this.recognition.continuous = this.config.continuous!;
    this.recognition.interimResults = this.config.interimResults!;
    this.recognition.maxAlternatives = this.config.maxAlternatives!;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('🎤 Voice recognition started');
      this.eventBus.emit('voice:start');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('🎤 Voice recognition ended');
      this.eventBus.emit('voice:end');
    };

    this.recognition.onerror = (event: any) => {
      console.error('🎤 Voice error:', event.error);
      this.eventBus.emit('voice:error', { error: event.error });
      
      if (event.error === 'not-allowed') {
        this.eventBus.emit('voice:permission-denied');
      }
    };

    this.recognition.onresult = (event: any) => {
      const results: SpeechResult[] = [];
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternative = result[0];
        
        results.push({
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          isFinal: result.isFinal
        });
      }

      const latestResult = results[results.length - 1];
      
      if (latestResult) {
        this.eventBus.emit('voice:result', latestResult);
        this.onTranscriptCallback?.(latestResult);

        if (latestResult.isFinal) {
          this.eventBus.emit(Events.INTENT_RECEIVED, { input: latestResult.transcript });
        }
      }
    };
  }

  /**
   * Start listening
   */
  start(): boolean {
    if (!this.isSupported || !this.recognition) {
      console.warn('Voice input not supported');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start voice recognition:', e);
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Toggle listening state
   */
  toggle(): boolean {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if voice input is supported
   */
  getIsSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Set callback for transcript
   */
  onTranscript(callback: (result: SpeechResult) => void): void {
    this.onTranscriptCallback = callback;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.recognition) {
      this.recognition.lang = this.config.lang!;
      this.recognition.continuous = this.config.continuous!;
      this.recognition.interimResults = this.config.interimResults!;
      this.recognition.maxAlternatives = this.config.maxAlternatives!;
    }
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'id-ID', name: 'Indonesian' },
      { code: 'ms-MY', name: 'Malay' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'zh-TW', name: 'Chinese (Traditional)' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'ko-KR', name: 'Korean' },
      { code: 'es-ES', name: 'Spanish' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'ru-RU', name: 'Russian' },
      { code: 'ar-SA', name: 'Arabic' }
    ];
  }
}

// Text-to-Speech
export class VoiceOutput {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[];
  private isSpeaking: boolean = false;
  private eventBus: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
    this.synth = window.speechSynthesis;
    this.voices = [];

    this.loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    console.log(`🔊 ${this.voices.length} voices loaded`);
  }

  /**
   * Speak text
   */
  speak(text: string, options?: {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
  }): void {
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (options?.voice) {
      utterance.voice = options.voice;
    } else if (options?.lang) {
      utterance.lang = options.lang;
    }

    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.eventBus.emit('voice:speak-start');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.eventBus.emit('voice:speak-end');
    };

    utterance.onerror = (e) => {
      console.error('TTS error:', e);
      this.isSpeaking = false;
    };

    this.synth.speak(utterance);
  }

  /**
   * Stop speaking
   */
  stop(): void {
    if (this.synth.speaking) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  /**
   * Pause speaking
   */
  pause(): void {
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  /**
   * Resume speaking
   */
  resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  /**
   * Get speaking state
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
